// Copyleft (ɔ) 2019 The Caliopen contributors.
// Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
// license (AGPL) that can be found in the LICENSE file.

package imap_worker

import (
	"encoding/json"
	. "github.com/CaliOpen/Caliopen/src/backend/defs/go-objects"
	"github.com/CaliOpen/Caliopen/src/backend/main/go.backends/backendstest"
	"github.com/nats-io/gnatsd/server"
	"github.com/nats-io/go-nats"
	"github.com/satori/go.uuid"
	"testing"
	"time"
)

const (
	replyErrorTopic = "testReplyError"
)

func initTestSender() (sender *Sender, natsServer *server.Server, err error) {
	worker, natsServer, err := newWorkerTest()
	sender = &Sender{
		Hostname:      worker.Config.Hostname,
		ImapProviders: worker.Lda.Providers,
		NatsConn:      worker.NatsConn,
		OutSMTPtopic:  worker.Config.LDAConfig.OutTopic,
		Store:         worker.Store,
	}
	return
}

// the whole process of sending an email is not tested here,
// but only APIs calls and responses/errors handling
func TestSender_SendDraft(t *testing.T) {
	sender, natsServer, err := initTestSender()
	defer natsServer.Shutdown()
	if err != nil {
		t.Error(err)
		return
	}
	c := make(chan struct{})
	// add a global subscriber to test errors replies
	globalErrSub, err := sender.NatsConn.Subscribe(replyErrorTopic, func(msg *nats.Msg) {
		defer close(c)
		var resp DeliveryAck
		err := json.Unmarshal(msg.Data, &resp)
		if err != nil {
			t.Error(err)
			return
		}
		if !resp.Err {
			t.Error("expected DeliveryAck.Err == true, got false")
			return
		}
		if resp.Response == "" {
			t.Error("expected DeliveryAck.Response to be non empty string, got empty string")
		}
	})
	if err != nil {
		t.Error(err)
		return
	}
	// test SendDraft with non existent identity
	fakeUUID := uuid.NewV4().String()

	sendOrder := BrokerOrder{
		IdentityId: fakeUUID,
		MessageId:  fakeUUID,
		Order:      "deliver",
		UserId:     fakeUUID,
	}
	jsonOrder, _ := json.Marshal(sendOrder)
	natsPayload := nats.Msg{
		Subject: "test",
		Reply:   replyErrorTopic,
		Data:    jsonOrder,
	}
	sender.SendDraft(&natsPayload)
	select {
	case <-c:
	case <-time.After(time.Second):
		t.Errorf("timeout waiting for sendDraft response for order : %+v", sendOrder)
	}

	// test SendDraft with LMTP responding an error
	c = make(chan struct{})
	lmtpErrorSub, err := sender.NatsConn.Subscribe(sender.OutSMTPtopic, func(msg *nats.Msg) {
		err := sender.NatsConn.Publish(msg.Reply, []byte(`{"error":true,"message":"fake smtp error"}`))
		if err != nil {
			t.Error(err)
		}
	})
	if err != nil {
		t.Error(err)
	} else {
		sendOrder := BrokerOrder{
			IdentityId: "7e4eb26d-1b70-4bb3-b556-6c54f046e88e",
			MessageId:  fakeUUID,
			Order:      "deliver",
			UserId:     backendstest.EmmaTommeUserId,
		}
		jsonOrder, _ := json.Marshal(sendOrder)
		natsPayload := nats.Msg{
			Subject: "test",
			Reply:   replyErrorTopic,
			Data:    jsonOrder,
		}
		sender.SendDraft(&natsPayload)
		select {
		case <-c:
		case <-time.After(time.Second):
			t.Errorf("timeout waiting for sendDraft response for order : %+v", sendOrder)
		}
	}
	_ = lmtpErrorSub.Unsubscribe()

	// test SendDraft with valid payload and OK from lmtp
	// but invalid message ID
	c = make(chan struct{})
	lmtpBadMsgSub, err := sender.NatsConn.Subscribe(sender.OutSMTPtopic, func(msg *nats.Msg) {
		err := sender.NatsConn.Publish(msg.Reply, []byte(`{"error":false,"message":""}`))
		if err != nil {
			t.Error(err)
		}
	})
	if err != nil {
		t.Error(err)
	} else {
		sendOrder := BrokerOrder{
			IdentityId: "7e4eb26d-1b70-4bb3-b556-6c54f046e88e",
			MessageId:  fakeUUID,
			Order:      "deliver",
			UserId:     backendstest.EmmaTommeUserId,
		}
		jsonOrder, _ := json.Marshal(sendOrder)
		natsPayload := nats.Msg{
			Subject: "test",
			Reply:   replyErrorTopic,
			Data:    jsonOrder,
		}
		sender.SendDraft(&natsPayload)
		select {
		case <-c:
		case <-time.After(time.Second):
			t.Errorf("timeout waiting for sendDraft response for order : %+v", sendOrder)
		}
	}
	_ = lmtpBadMsgSub.Unsubscribe()

	// test SendDraft with valid payload and OK from lmtp
	// should call uploadSentMessageToRemote because identity is a remote one
	// and should re-publish lmtp reply
	_ = globalErrSub.Unsubscribe()
	c = make(chan struct{})
	lmtpOKMsgSub, err := sender.NatsConn.Subscribe(sender.OutSMTPtopic, func(msg *nats.Msg) {
		err := sender.NatsConn.Publish(msg.Reply, []byte(`{"error":false,"message":""}`))
		if err != nil {
			t.Error(err)
		}
	})
	_, err = sender.NatsConn.Subscribe("ok reply", func(msg *nats.Msg) {
		defer close(c)
		var resp DeliveryAck
		err := json.Unmarshal(msg.Data, &resp)
		if err != nil {
			t.Error(err)
			return
		}
		if resp.Err {
			t.Error("expected DeliveryAck.Err == false, got true")
			return
		}
		if resp.Response != "" {
			t.Error("expected DeliveryAck.Response to be empty string, got non empty string")
		}
	})
	if err != nil {
		t.Error(err)
	} else {
		sendOrder := BrokerOrder{
			IdentityId: "7e4eb26d-1b70-4bb3-b556-6c54f046e88e",
			MessageId:  "b26e5ba4-34cc-42bb-9b70-5279648134f8",
			Order:      "deliver",
			UserId:     backendstest.EmmaTommeUserId,
		}
		jsonOrder, _ := json.Marshal(sendOrder)
		natsPayload := nats.Msg{
			Subject: "test",
			Reply:   "ok reply",
			Data:    jsonOrder,
		}
		// override func to prevent cascading calls
		uploadSentMessageToRemote = func(s *Sender, userIdentity *UserIdentity, msg *Message) error {
			return nil
		}
		sender.SendDraft(&natsPayload)
		select {
		case <-c:
		case <-time.After(time.Second):
			t.Errorf("timeout waiting for sendDraft response for order : %+v", sendOrder)
		}
	}
	_ = lmtpOKMsgSub.Unsubscribe()

}
