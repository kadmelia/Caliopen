// Copyleft (ɔ) 2019 The Caliopen contributors.
// Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
// license (AGPL) that can be found in the LICENSE file.

package imap_worker

import (
	"encoding/json"
	"fmt"
	"github.com/CaliOpen/Caliopen/src/backend/brokers/go.emails"
	. "github.com/CaliOpen/Caliopen/src/backend/defs/go-objects"
	"github.com/CaliOpen/Caliopen/src/backend/main/go.backends/backendstest"
	"github.com/nats-io/gnatsd/server"
	"github.com/nats-io/go-nats"
	"strconv"
	"sync"
	"testing"
	"time"
)

const (
	natsUrl  = "0.0.0.0"
	natsPort = 61000
)

var (
	fakeSync = (*Fetcher).SyncRemoteWithLocal
)

func newWorkerTest() (worker *Worker, natsServer *server.Server, err error) {
	worker = &Worker{
		Config: WorkerConfig{
			NatsQueue:            "IMAPworkers",
			NatsTopicPoller:      "imapJobs",
			NatsTopicPollerCache: "idCache",
			NatsTopicSender:      "outboundIMAP",
		},
		Id:       "testWorker",
		NatsSubs: make([]*nats.Subscription, 1),
	}

	// starting an embedded nats server
	natsServer, err = server.NewServer(&server.Options{
		Host:     natsUrl,
		Port:     natsPort,
		HTTPPort: -1,
		Cluster:  server.ClusterOpts{Port: -1},
		NoLog:    true,
		NoSigs:   true,
		Debug:    false,
		Trace:    false,
	})
	if err != nil || natsServer == nil {
		panic(fmt.Sprintf("No NATS Server object returned: %v", err))
	}
	go natsServer.Start()
	// Wait for accept loop(s) to be started
	if !natsServer.ReadyForConnections(10 * time.Second) {
		panic("Unable to start NATS Server in Go Routine")
	}

	worker.NatsConn, err = nats.Connect("nats://" + natsUrl + ":" + strconv.Itoa(natsPort))

	connectors := email_broker.EmailBrokerConnectors{
		Ingress: make(chan *email_broker.SmtpEmail),
		Egress:  make(chan *email_broker.SmtpEmail),
	}
	worker.Lda = &Lda{
		broker: &email_broker.EmailBroker{
			Store:      backendstest.GetLDAStoreBackend(),
			Index:      backendstest.GetLDAIndexBackend(),
			NatsConn:   worker.NatsConn,
			Connectors: connectors,
		},
		brokerConnectors: connectors,
		Providers:        make(map[string]Provider),
	}

	if err != nil {
		return nil, nil, fmt.Errorf("[initMqHandler] failed to init NATS connection : %s", err)
	}

	worker.Store = backendstest.GetLDAStoreBackend()

	return
}

func TestWorker_StartAndStop(t *testing.T) {
	w, s, err := newWorkerTest()
	if err != nil {
		t.Error(err)
	}
	defer s.Shutdown()

	// test if worker requests on Nats every second with the right payload
	c := make(chan struct{})
	wg := new(sync.WaitGroup)
	wg.Add(1)
	requestsReceived := 0
	go w.Start(time.Second)
	go func(wg *sync.WaitGroup, count int) {
		_, err := w.NatsConn.Subscribe("imapJobs", func(msg *nats.Msg) {
			var req WorkerRequest
			err := json.Unmarshal(msg.Data, &req)
			if err != nil {
				t.Errorf("unable to unmarshal worker's request : %s", err)
				return
			}
			if req.Order.Order != "need_job" {
				t.Errorf("expected to receive order 'need_job', got %s", req.Order.Order)
			}
			w.NatsConn.Publish(msg.Reply, []byte(`{"order":"no pending job"}`))
			count++
			if count == 3 {
				wg.Done()
				return
			}
		})
		if err != nil {
			t.Error(err)
		}
	}(wg, requestsReceived)
	go func() {
		wg.Wait()
		close(c)
	}()
	select {
	case <-c:
		// worker confirmed to send request every second ; now test halting
		w.HaltGroup = new(sync.WaitGroup)
		w.HaltGroup.Add(1)
		time.Sleep(500 * time.Millisecond)
		if !w.NatsConn.IsClosed() {
			t.Error("expected worker's nats connexion to be closed")
		}
		for _, sub := range w.NatsSubs {
			if sub.IsValid() {
				t.Errorf("expected all worker's subscription closed, got <%s> still valid", sub.Subject)
			}
		}
		return
	case <-time.After(5 * time.Second):
		t.Error("timeout waiting for worker to send requests on nats")
	}
}

func TestWorker_natsMsgHandler(t *testing.T) {
	w, s, err := newWorkerTest()
	if err != nil {
		t.Error(err)
	}
	defer s.Shutdown()

	syncRemoteCalled, fetchRemoteCalled := false, false
	// overriding funcs that should be called within natsMsgHandler but are out of this test scope
	syncRemoteWithLocal = func(f *Fetcher, order IMAPorder) error {
		syncRemoteCalled = true
		if f == nil {
			t.Error("expected a Fetcher within syncRemoteWithLocal call, got nil")
			return nil
		}
		if f.Store != w.Store {
			t.Errorf("expected a fetcher set with worker's store, got %+v", f.Store)
		}
		if f.Lda != w.Lda {
			t.Errorf("expected a fetcher set with worker's store, got %+v", f.Store)
		}
		return nil
	}
	fetchRemoteToLocal = func(f *Fetcher, order IMAPorder) error {
		fetchRemoteCalled = true
		if f == nil {
			t.Error("expected a Fetcher within fetchRemoteToLocal call, got nil")
			return nil
		}
		if f.Store != w.Store {
			t.Errorf("expected a fetcher set with worker's store, got %+v", f.Store)
		}
		if f.Lda != w.Lda {
			t.Errorf("expected a fetcher set with worker's store, got %+v", f.Store)
		}
		return nil
	}
	c := make(chan struct{})
	sendDraft = func(s *Sender, msg *nats.Msg) {
		defer close(c)
		if s == nil {
			t.Error("expected a Sender within sendDraft call, got nil")
			return
		}
		if s.Store != w.Store {
			t.Errorf("expected a sender set with worker's store, got %+v", s.Store)
		}
		if s.NatsConn != w.NatsConn {
			t.Errorf("expected a sender set with worker's natsConn, got %+v", s.NatsConn)
		}
		if s.NatsMessage != msg {
			t.Errorf("expected a sender with nats message embedded, got %+v", s.NatsMessage)
		}
	}
	// test orders handling
	// 'sync'
	order := IMAPorder{
		Order: "sync",
	}
	data, _ := json.Marshal(order)
	natsPayload := nats.Msg{
		Subject: "test",
		Reply:   "testMsgReply",
		Data:    data,
	}
	w.natsMsgHandler(&natsPayload)
	if !syncRemoteCalled {
		t.Error("expected 'sync' order to trigger a call to syncRemoteWithLocal func, but func was not called")
	}
	// 'fullfetch'
	order.Order = "fullfetch"
	data, _ = json.Marshal(order)
	natsPayload = nats.Msg{
		Subject: "test",
		Reply:   "testMsgReply",
		Data:    data,
	}
	w.natsMsgHandler(&natsPayload)
	if !fetchRemoteCalled {
		t.Error("expected 'fullfetch' order to trigger a call to fetchRemoteToLocal func, but func was not called")
	}
	// 'deliver'
	order.Order = "deliver"
	data, _ = json.Marshal(order)
	natsPayload = nats.Msg{
		Subject: "test",
		Reply:   "testMsgReply",
		Data:    data,
	}
	w.natsMsgHandler(&natsPayload)
	select {
	case <-c:
	case <-time.After(10 * time.Millisecond):
		t.Error("expected 'deliver' order to trigger a call to sendDraft func, but func was not called")
	}
}
