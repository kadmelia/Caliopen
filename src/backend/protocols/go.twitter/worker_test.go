package twitterworker

import (
	"fmt"
	"github.com/CaliOpen/Caliopen/src/backend/brokers/go.twitter"
	. "github.com/CaliOpen/Caliopen/src/backend/defs/go-objects"
	"github.com/CaliOpen/Caliopen/src/backend/main/go.backends/backendstest"
	"github.com/nats-io/gnatsd/server"
	"github.com/nats-io/go-nats"
	"github.com/satori/go.uuid"
	"math/rand"
	"strconv"
	"sync"
	"testing"
	"time"
)

const (
	natsUrl  = "0.0.0.0"
	natsPort = 61000
)

func initWorkerTest() (worker *Worker, natsServer *server.Server, err error) {
	// starting an embedded nats server
	fmt.Printf("starting nats server on port %d", natsPort)
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

	worker = &Worker{
		AccountHandlers: map[string]*AccountHandler{},
		Id:              "worker_id",
		WorkersGuard:    new(sync.RWMutex),
		Store:           backendstest.GetLDAStoreBackend(),
		Index:           backendstest.GetLDAIndexBackend(),
	}
	worker.NatsConn, err = nats.Connect("nats://" + natsUrl + ":" + strconv.Itoa(natsPort))
	if err != nil {
		return nil, nil, fmt.Errorf("[initMqHandler] failed to init NATS connection : %s", err)
	}
	worker.NatsSubs = make([]*nats.Subscription, 1)
	worker.NatsSubs[0], err = worker.NatsConn.QueueSubscribe("twitter_dm", "Twitterworkers", worker.DMmsgHandler)
	if err != nil {
		return nil, nil, err
	}
	return
}

func TestWorker_RegisterAccountHandler(t *testing.T) {
	w, s, err := initWorkerTest()
	if err != nil {
		t.Error(err)
		return
	}
	defer s.Shutdown()

	// test concurrent account handler registration
	const count = 1000 // must be an even number
	workers := [count + 1]string{}
	wg := new(sync.WaitGroup)
	wg.Add(count)
	c := make(chan struct{})
	for i := 0; i < count; i++ {
		go func(indice int) {
			handler := new(AccountHandler)
			userId := UUID(uuid.NewV4())
			remoteId := UUID(uuid.NewV4())
			workers[indice] = userId.String() + remoteId.String()
			handler.userAccount = &TwitterAccount{
				remoteID:  remoteId,
				twitterID: strconv.Itoa(indice),
				userID:    userId,
			}
			handler.broker = &twitter_broker.TwitterBroker{
				NatsConn: w.NatsConn,
				Store:    backendstest.GetLDAStoreBackend(),
				Index:    backendstest.GetLDAIndexBackend(),
				Connectors: twitter_broker.TwitterBrokerConnectors{
					Egress: make(chan twitter_broker.NatsCom),
					Halt:   make(chan struct{}),
				},
			}
			handler.WorkerDesk = make(chan uint)
			w.RegisterAccountHandler(handler)
			wg.Done()
		}(i)
	}
	go func() {
		wg.Wait()
		close(c)
	}()

	select {
	case <-c:
		if len(w.AccountHandlers) != count {
			t.Errorf("expected %d accountHandlers, got %d", count, len(w.AccountHandlers))
		}
		// pick few handlers randomly to test AccountHandlers consistency
		rand.Seed(time.Now().Unix())
		for i := 0; i < count/2; i++ {
			pick := rand.Intn(count)
			if handler, ok := w.AccountHandlers[workers[pick]]; ok {
				handlerKey := handler.userAccount.userID.String() + handler.userAccount.remoteID.String()
				if handlerKey != workers[pick] {
					t.Errorf("expected handler's key to be %s, got %s", workers[pick], handlerKey)
				}
			} else {
				t.Errorf("expected to find handler with key %s, got nothing", workers[pick])
			}
		}
		// re-register an existing handler to test stop&remove operations
		pick := rand.Intn(count)
		handler := w.AccountHandlers[workers[pick]]
		const s = "register twice"
		(*handler).userAccount.screenName = s
		w.RegisterAccountHandler(handler)
		if w.AccountHandlers[workers[pick]].userAccount.screenName != s {
			t.Errorf("expected userAccount.screenName of re-registered worker to be %s, got %s", s, w.AccountHandlers[workers[pick]].userAccount.screenName)
		}
	case <-time.After(time.Second):
		t.Error("timeout waiting for concurrent RegisterAccountHandler")
	}

}

func TestWorker_getOrCreateHandler(t *testing.T) {
	w, s, err := initWorkerTest()
	if err != nil {
		t.Error(err)
		return
	}
	defer s.Shutdown()

	// test automatic creation of AccountHandler
	userId := backendstest.EmmaTommeUserId
	remoteId := "b91f0fa8-17a2-4729-8a5a-5ff58ee5c121"
	handler := w.getOrCreateHandler(userId, remoteId)
	if handler == nil {
		t.Error("expected a new handler, got nil")
	}
}

func TestWorker_RemoveAccountHandler(t *testing.T) {
	w, s, err := initWorkerTest()
	if err != nil {
		t.Error(err)
		return
	}
	defer s.Shutdown()
	// add a bunch of workers
	const count = 1000 // must be an even number
	workers := [count + 1][2]string{}
	for i := 0; i < count; i++ {
		handler := new(AccountHandler)
		userId := UUID(uuid.NewV4())
		remoteId := UUID(uuid.NewV4())
		workers[i] = [2]string{userId.String(), remoteId.String()}
		handler.userAccount = &TwitterAccount{
			remoteID:  remoteId,
			twitterID: strconv.Itoa(i),
			userID:    userId,
		}
		handler.broker = &twitter_broker.TwitterBroker{
			NatsConn: w.NatsConn,
			Store:    backendstest.GetLDAStoreBackend(),
			Index:    backendstest.GetLDAIndexBackend(),
			Connectors: twitter_broker.TwitterBrokerConnectors{
				Egress: make(chan twitter_broker.NatsCom),
				Halt:   make(chan struct{}),
			},
		}
		handler.WorkerDesk = make(chan uint)
		w.RegisterAccountHandler(handler)
	}

	// concurrently get & remove half of workers
	wg := new(sync.WaitGroup)
	wg.Add(count / 2)
	c := make(chan struct{})
	for i := 0; i < count/2; i++ {
		go func(indice int) {
			ah := w.getOrCreateHandler(workers[indice][0], workers[indice][1])
			if ah != nil {
				w.RemoveAccountHandler(ah)
			} else {
				t.Error("expcted to get a worker, got nil")
			}
			wg.Done()
		}(i)
	}
	go func() {
		wg.Wait()
		close(c)
	}()
	select {
	case <-c:
		if len(w.AccountHandlers) != count/2 {
			t.Errorf("expected %d account handlers left, got %d", count/2, len(w.AccountHandlers))
		}
	case <-time.After(time.Second):
		t.Error("timeout waiting for concurrent RemoveAccountHandler")
	}
}
