/*
 * // Copyleft (ɔ) 2018 The Caliopen contributors.
 * // Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
 * // license (AGPL) that can be found in the LICENSE file.
 */

package imap_worker

import (
	"encoding/json"
	"errors"
	"fmt"
	. "github.com/CaliOpen/Caliopen/src/backend/defs/go-objects"
	"github.com/CaliOpen/Caliopen/src/backend/main/go.backends"
	"github.com/CaliOpen/Caliopen/src/backend/main/go.main/users"
	log "github.com/Sirupsen/logrus"
	"github.com/nats-io/go-nats"
	"time"
)

type Sender struct {
	Hostname      string
	ImapProviders map[string]Provider
	NatsConn      *nats.Conn
	NatsMessage   *nats.Msg
	OutSMTPtopic  string
	Store         backends.LDAStore
}

// unexported vars to help override funcs in tests
var sendDraft = func(s *Sender, msg *nats.Msg) {
	s.SendDraft(msg)
}

func (s *Sender) SendDraft(msg *nats.Msg) {
	var order BrokerOrder
	err := json.Unmarshal(msg.Data, &order)
	if err != nil {
		s.natsReplyError(msg, fmt.Errorf("Unable to unmarshal message from NATS. Payload was <%s>", string(msg.Data)))
		return
	}
	// get userIdentity and check auth params validity
	if err != nil {
		s.natsReplyError(msg, err)
		return
	}
	userIdentity, err := s.Store.RetrieveUserIdentity(order.UserId, order.IdentityId, true)
	if err != nil {
		s.natsReplyError(msg, err)
		return
	}
	if userIdentity.Infos["authtype"] == Oauth2 {
		err = users.ValidateOauth2Credentials(userIdentity, s, true)
		if err != nil {
			s.natsReplyError(msg, err)
			return
		}
	}

	//1. make use of our lmtpd to send email
	natsMessage, e := json.Marshal(order)
	if e != nil {
		s.natsReplyError(msg, errors.New("[SendDraft] failed to build nats message"))
		return
	}
	smtpReply, err := s.NatsConn.Request(s.OutSMTPtopic, []byte(natsMessage), 30*time.Second)

	//2. handle LMTP response
	if err != nil {
		if smtpReply != nil {
			s.natsReplyError(msg, errors.New(smtpReply.Reply))
			return
		} else {
			s.natsReplyError(msg, err)
			return
		}
	}
	var reply DeliveryAck
	err = json.Unmarshal(smtpReply.Data, &reply)
	if err != nil {
		s.natsReplyError(msg, fmt.Errorf("[IMAPworker]SendDraft failed to unmarshal smtpReply : %s", err))
		return
	}
	if reply.Err {
		s.natsReplyError(msg, errors.New(reply.Response))
		return
	}

	//3. no error when sending email,
	// if applicable upload a copy to remote IMAP account
	if userIdentity.Type == RemoteIdentity {
		sentMsg, err := s.Store.RetrieveMessage(order.UserId, order.MessageId)
		if err != nil {
			s.natsReplyError(msg, fmt.Errorf("[IMAPworker]SendDraft failed to retrieve sent message : %s", err))
			return
		}
		err = s.UploadSentMessageToRemote(userIdentity, sentMsg)
		if err != nil {
			s.natsReplyError(msg, fmt.Errorf("[IMAPworker]SendDraft failed to upload sent email to remote IMAP account : %s", err))
			return
		}
	}
	//4. respond to caller
	s.NatsConn.Publish(msg.Reply, smtpReply.Data)
}

func (s *Sender) natsReplyError(msg *nats.Msg, err error) {
	log.WithError(err).Warnf("IMAPworker [outbound] : error when processing incoming nats message : %+v", *msg)

	ack := DeliveryAck{
		Err:      true,
		Response: fmt.Sprintf("failed to handle order with error « %s » ", err.Error()),
	}

	json_resp, _ := json.Marshal(ack)
	s.NatsConn.Publish(msg.Reply, json_resp)
}

func (s *Sender) UploadSentMessageToRemote(userIdentity *UserIdentity, msg *Message) error {

	//get raw message
	rawMail, err := s.Store.GetRawMessage(msg.Raw_msg_id.String())
	if err != nil {
		return err
	}

	if userIdentity.Infos["authtype"] == Oauth2 {
		err = users.ValidateOauth2Credentials(userIdentity, s, true)
		if err != nil {
			return err
		}
	}
	_, imapClient, _, err := imapLogin(userIdentity)
	if err != nil {
		return err
	}
	defer imapClient.Logout()

	return uploadSentMessage(imapClient, rawMail.Raw_data, msg.Date)
}

/* Oauth2Interfacer implementation */

func (s *Sender) GetProviders() map[string]Provider {
	return s.ImapProviders
}

func (s *Sender) GetHostname() string {
	return s.Hostname
}

func (s *Sender) GetIdentityStore() backends.IdentityStorageUpdater {
	return s.Store
}
