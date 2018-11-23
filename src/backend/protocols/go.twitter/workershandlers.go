package twitterworker

import (
	broker "github.com/CaliOpen/Caliopen/src/backend/brokers/go.twitter"
	log "github.com/Sirupsen/logrus"
	"github.com/nats-io/go-nats"
	"sync"
)

type (
	Worker struct {
		WorkersGuard   *sync.RWMutex
		AccountWorkers map[string]*AccountWorker // one worker per active Twitter account
		NatsConn       *nats.Conn
		NatsSubs       []*nats.Subscription
		conf           WorkerConfig
	}

	WorkerConfig struct {
		TwitterAppKey    string              `mapstructure:"twitter_app_key"`
		TwitterAppSecret string              `mapstructure:"twitter_app_secret"`
		BrokerConfig     broker.BrokerConfig `mapstructure:"BrokerConfig"`
	}
)

func InitAndStartWorker(conf WorkerConfig) (worker *Worker, err error) {

	worker = &Worker{
		WorkersGuard:   new(sync.RWMutex),
		AccountWorkers: map[string]*AccountWorker{},
		conf:           conf,
	}

	worker.NatsConn, err = nats.Connect(conf.BrokerConfig.NatsURL)
	if err != nil {
		log.WithError(err).Fatal("[TwitterWorker] initialization of NATS connexion failed")
	}
	worker.NatsSubs = make([]*nats.Subscription, 2)
	worker.NatsSubs[0], err = worker.NatsConn.QueueSubscribe(conf.BrokerConfig.NatsTopicWorkers, conf.BrokerConfig.NatsQueue, worker.WorkerMsgHandler)
	if err != nil {
		log.WithError(err).Fatal("[TwitterWorker] initialization of NATS fetcher subscription failed")
	}

	worker.NatsSubs[1], err = worker.NatsConn.QueueSubscribe(conf.BrokerConfig.NatsTopicDMs, conf.BrokerConfig.NatsQueue, worker.DMmsgHandler)
	if err != nil {
		log.WithError(err).Fatal("[TwitterWorker] initialization of NATS fetcher subscription failed")
	}

	worker.NatsConn.Flush()
	return
}

func (worker *Worker) Stop() {
	for _, w := range worker.AccountWorkers {
		w.WorkerDesk <- Stop
	}
	for _, sub := range worker.NatsSubs {
		sub.Unsubscribe()
	}
	worker.NatsConn.Close()
}

// getOrCreateWorker returns a pointer to a worker already in cache
// or tries to create a new worker for the remote identity if not.
// returns nil if get or create failed.
func (w *Worker) getOrCreateWorker(userId, remoteId string) *AccountWorker {
	if accountWorker, ok := w.AccountWorkers[userId+remoteId]; ok {
		return accountWorker
	} else {
		log.Infof("[getOrCreateWorker] failed to retrieve registered worker for remote %s (user %s). Trying to add one.", remoteId, userId)
		if userId == "" || remoteId == "" {
			return nil
		}
		accountWorker, err := NewAccountWorker(userId, remoteId, w.conf)
		if err != nil {
			log.WithError(err).Warnf("[getOrCreateWorker] failed to create new worker for remote %s (user %s)", remoteId, userId)
			return nil
		}
		w.RegisterWorker(accountWorker)
		go accountWorker.Start()
		return accountWorker

	}
}

func (w *Worker) RegisterWorker(accountWorker *AccountWorker) {
	workerKey := accountWorker.userAccount.userID.String() + accountWorker.userAccount.remoteID.String()
	// do not register same broker twice
	if registeredWorker, ok := w.AccountWorkers[workerKey]; ok {
		w.RemoveAccountWorker(registeredWorker)
	}
	w.WorkersGuard.Lock()
	w.AccountWorkers[workerKey] = accountWorker
	w.WorkersGuard.Unlock()
}

func (w *Worker) RemoveAccountWorker(accountWorker *AccountWorker) {
	workerKey := accountWorker.userAccount.userID.String() + accountWorker.userAccount.remoteID.String()
	w.WorkersGuard.Lock()
	accountWorker.Stop()
	delete(w.AccountWorkers, workerKey)
	w.WorkersGuard.Unlock()
}
