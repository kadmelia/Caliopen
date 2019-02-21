/*
 * // Copyleft (ɔ) 2018 The Caliopen contributors.
 * // Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
 * // license (AGPL) that can be found in the LICENSE file.
 */

package imap_worker

import (
	"encoding/json"
	"fmt"
	. "github.com/CaliOpen/Caliopen/src/backend/defs/go-objects"
	"github.com/CaliOpen/Caliopen/src/backend/main/go.backends"
	"github.com/CaliOpen/Caliopen/src/backend/main/go.backends/store/cassandra"
	log "github.com/Sirupsen/logrus"
	"github.com/gocql/gocql"
	"github.com/nats-io/go-nats"
	"sync"
	"time"
)

type Worker struct {
	Config    WorkerConfig
	Id        string
	Lda       *Lda
	NatsConn  *nats.Conn
	NatsSubs  []*nats.Subscription
	Store     backends.LDAStore
	HaltGroup *sync.WaitGroup
}

const (
	noPendingJobErr = "no pending job"
	pollThrottling  = 30 * time.Second
	needJobOrderStr = `{"worker":"%s","order":{"order":"need_job"}}`
)

// NewWorker loads config, checks for errors then returns a worker ready to start.
func NewWorker(config WorkerConfig, id string) (worker *Worker, err error) {

	w := Worker{
		Config:   config,
		Id:       id,
		NatsSubs: make([]*nats.Subscription, 1),
	}
	//copy relevant config to LDAConfig
	w.Config.LDAConfig.StoreName = w.Config.StoreName
	w.Config.LDAConfig.NatsURL = w.Config.NatsUrl
	w.Config.LDAConfig.StoreConfig = w.Config.StoreConfig

	// init all connexions, they will be pass to fetchers
	// Lda
	w.Lda, err = NewLda(w.Config)
	if err != nil {
		log.WithError(err).Warn("[NewWorker] : initalization of LDA failed")
		return nil, err
	}

	// Nats
	w.NatsConn, err = nats.Connect(config.NatsUrl)
	if err != nil {
		log.WithError(err).Warn("[NewWorker] : initalization of NATS connexion failed")
		return nil, err
	}

	// Store
	switch config.StoreName {
	case "cassandra":
		c := store.CassandraConfig{
			Hosts:       config.StoreConfig.Hosts,
			Keyspace:    config.StoreConfig.Keyspace,
			Consistency: gocql.Consistency(config.StoreConfig.Consistency),
			SizeLimit:   config.StoreConfig.SizeLimit,
			UseVault:    config.StoreConfig.UseVault,
		}
		if config.StoreConfig.ObjectStore == "s3" {
			c.WithObjStore = true
			c.Endpoint = config.StoreConfig.OSSConfig.Endpoint
			c.AccessKey = config.StoreConfig.OSSConfig.AccessKey
			c.SecretKey = config.StoreConfig.OSSConfig.SecretKey
			c.RawMsgBucket = config.StoreConfig.OSSConfig.Buckets["raw_messages"]
			c.AttachmentBucket = config.StoreConfig.OSSConfig.Buckets["temporary_attachments"]
			c.Location = config.StoreConfig.OSSConfig.Location
		}
		if c.UseVault {
			c.Url = config.StoreConfig.VaultConfig.Url
			c.Username = config.StoreConfig.VaultConfig.Username
			c.Password = config.StoreConfig.VaultConfig.Password
		}
		w.Store, err = store.InitializeCassandraBackend(c)
		if err != nil {
			log.WithError(err).Warnf("[NewWorker] initalization of %s backend failed", config.StoreName)
			return nil, err
		}
	}

	return &w, nil
}

func (worker *Worker) Start(throttling ...time.Duration) error {
	var throttle time.Duration
	if len(throttling) == 1 && throttling[0] != 0 {
		throttle = throttling[0]
	} else {
		throttle = pollThrottling
	}
	var err error
	(*worker).NatsSubs[0], err = worker.NatsConn.QueueSubscribe(worker.Config.NatsTopicSender, worker.Config.NatsQueue, worker.natsMsgHandler)
	if err != nil {
		return err
	}
	worker.NatsConn.Flush()
	log.Infof("IMAP worker %s started", worker.Id)

	// start throttled jobs polling
	for {
		start := time.Now()
		requestOrder := []byte(fmt.Sprintf(needJobOrderStr, worker.Id))
		log.Infof("IMAP worker %s is requesting jobs to idpoller", worker.Id)
		resp, err := worker.NatsConn.Request(worker.Config.NatsTopicPoller, requestOrder, time.Minute)
		if err != nil {
			log.WithError(err).Warnf("[worker %s] failed to request pending jobs on nats", worker.Id)
		} else {
			worker.natsMsgHandler(resp)
		}
		// check for interrupt after job is finished
		if worker.HaltGroup != nil {
			worker.Stop()
			break
		}
		elapsed := time.Now().Sub(start)
		if elapsed < throttle {
			time.Sleep(throttle - elapsed)
		}
	}
	return nil
}

func (worker *Worker) Stop() {
	for _, sub := range worker.NatsSubs {
		sub.Unsubscribe()
	}
	worker.NatsConn.Close()
	worker.Store.Close()
	worker.Lda.broker.Store.Close()
	worker.Lda.broker.NatsConn.Close()
	worker.HaltGroup.Done()
	log.Infof("worker %s stopped", worker.Id)
}

// MsgHandler parses message and launches appropriate goroutine to handle requested operations
func (worker *Worker) natsMsgHandler(msg *nats.Msg) {
	message := IMAPorder{}
	err := json.Unmarshal(msg.Data, &message)
	if err != nil {
		log.WithError(err).Errorf("Unable to unmarshal message from NATS. Payload was <%s>", string(msg.Data))
		return
	}
	switch message.Order {
	case noPendingJobErr:
		return
	case "sync": // simplest order to initiate a sync op for a stored remote identity
		fetcher := Fetcher{
			Hostname: worker.Config.Hostname,
			Lda:      worker.Lda,
			Store:    worker.Store,
		}
		go syncRemoteWithLocal(&fetcher, message)
	case "fullfetch": // order sent by imapctl to initiate a fetch op for an user
		fetcher := Fetcher{
			Hostname: worker.Config.Hostname,
			Lda:      worker.Lda,
			Store:    worker.Store,
		}
		go fetchRemoteToLocal(&fetcher, message)
	case "deliver": // order sent by api2 to send a draft via remote SMTP/IMAP
		sender := Sender{
			Hostname:      worker.Config.Hostname,
			ImapProviders: worker.Lda.Providers,
			NatsConn:      worker.NatsConn,
			NatsMessage:   msg,
			OutSMTPtopic:  worker.Config.LDAConfig.OutTopic,
			Store:         worker.Store,
		}
		go sendDraft(&sender, msg)
	case "test":
		log.Info("Order « test » received")
	}
}
