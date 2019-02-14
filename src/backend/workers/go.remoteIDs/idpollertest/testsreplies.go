// Copyleft (ɔ) 2019 The Caliopen contributors.
// Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
// license (AGPL) that can be found in the LICENSE file.

// package idpollertest provides routines to reply to requests sent by tests on idpoller's nats topics
package idpollertest

import (
	"encoding/json"
	. "github.com/CaliOpen/Caliopen/src/backend/defs/go-objects"
	idpoller "github.com/CaliOpen/Caliopen/src/backend/workers/go.remoteIDs"
	"github.com/nats-io/go-nats"
	"github.com/satori/go.uuid"
	"math/rand"
	"time"
)

var Mqh *idpoller.MqHandler

func RegisterIdpollerTest(conn *nats.Conn) (*idpoller.MqHandler, error) {
	Mqh = new(idpoller.MqHandler)
	sub, err := conn.Subscribe("twitterJobs", twitterJobsHandler)
	if err != nil {
		return nil, err
	}
	Mqh.NatsSubTwitter = sub
	return Mqh, nil
}

func twitterJobsHandler(msg *nats.Msg) {
	var req WorkerRequest
	err := json.Unmarshal(msg.Data, &req)
	if err != nil {
		Mqh.NatsConn.Publish(msg.Reply, []byte(`{"order":"error : unable to unmarshal request"}`))
	}
	switch req.Order.Order {
	case "need_job":
		// randomly give a job or no job
		rand.Seed(time.Now().Unix())
		if rand.Intn(2) == 0 {
			Mqh.NatsConn.Publish(msg.Reply, []byte(`{"order":"no pending job"}`))
		} else {
			fakeID := uuid.NewV4().String()
			job := idpoller.Job{
				Worker: "twitter",
				Order: BrokerOrder{
					MessageId:  fakeID,
					Order:      "sync",
					IdentityId: fakeID,
					UserId:     fakeID,
				},
			}
			reply, _ := json.Marshal(job.Order)
			Mqh.NatsConn.Publish(msg.Reply, reply)
		}
	case "give_job":
		fakeID := uuid.NewV4().String()
		job := idpoller.Job{
			Worker: "twitter",
			Order: BrokerOrder{
				MessageId:  fakeID,
				Order:      "sync",
				IdentityId: fakeID,
				UserId:     fakeID,
			},
		}
		reply, _ := json.Marshal(job.Order)
		Mqh.NatsConn.Publish(msg.Reply, reply)
	case "give_no_job":
		Mqh.NatsConn.Publish(msg.Reply, []byte(`{"order":"no pending job"}`))
	case "give_error":
		Mqh.NatsConn.Publish(msg.Reply, []byte(`{"order":"error"}`))
	default:
		Mqh.NatsConn.Publish(msg.Reply, []byte(`{"order":"error : unknown order"}`))
	}
}
