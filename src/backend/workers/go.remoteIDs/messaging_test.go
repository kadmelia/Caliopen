// Copyleft (ɔ) 2019 The Caliopen contributors.
// Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
// license (AGPL) that can be found in the LICENSE file.

package go_remoteIDs

import (
	"errors"
	"fmt"
	"github.com/nats-io/gnatsd/server"
	"github.com/phayes/freeport"
	"strconv"
	"testing"
	"time"
)

const (
	natsUrl = "0.0.0.0"
)

func initMqHandlerTest() (*MqHandler, error) {
	// starting an embedded nats server
	port, err := freeport.GetFreePort()
	if err != nil {
		return nil, err
	}
	s, err := server.NewServer(&server.Options{
		Host:     natsUrl,
		Port:     port,
		HTTPPort: -1,
		Cluster:  server.ClusterOpts{Port: -1},
		NoLog:    true,
		NoSigs:   true,
		Debug:    false,
		Trace:    false,
	})
	if err != nil || s == nil {
		panic(fmt.Sprintf("No NATS Server object returned: %v", err))
	}
	go s.Start()
	// Wait for accept loop(s) to be started
	if !s.ReadyForConnections(10 * time.Second) {
		return nil, errors.New("Unable to start NATS Server in Go Routine")
	}

	poller.Config = PollerConfig{
		NatsUrl: "nats://" + natsUrl + ":" + strconv.Itoa(port),
		NatsTopics: map[string]string{
			"id_cache": "idCache",
			"imap":     "imapJobs",
			"twitter":  "twitterJobs",
		},
	}

	return InitMqHandler()
}

func TestInitMqHandler(t *testing.T) {
	mqh, err := initMqHandlerTest()
	if err != nil {
		t.Error(err)
		return
	}
	if mqh == nil {
		t.Error("no mqh returned")
		return
	}
	if mqh.NatsConn == nil {
		t.Error("nats conn is nil")
	}
	if mqh.NatsSubIdentities == nil {
		t.Error("nats identities subscription is nil")
	}
	if mqh.NatsSubTwitter == nil {
		t.Error("nats Twitter subscription is nil")
	}
	if mqh.NatsSubImap == nil {
		t.Error("nats imap subscription is nil")
	}
}

func TestMqHandler_natsIdentitiesHandler(t *testing.T) {

}
