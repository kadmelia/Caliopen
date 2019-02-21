// Copyleft (ɔ) 2019 The Caliopen contributors.
// Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
// license (AGPL) that can be found in the LICENSE file.

package backendstest

import (
	"errors"
	. "github.com/CaliOpen/Caliopen/src/backend/defs/go-objects"
)

type MessagesBackend map[string]*Message

func GetMessagesBackend() MessagesBackend {
	return MessagesBackend(messages)
}

func (mb MessagesBackend) RetrieveMessage(userId, msgId string) (msg *Message, err error) {
	if userId == "" && msgId == "" {
		// return one message by default
		for _, msg = range mb {
			return
		}
	}
	var ok bool
	if msg, ok = mb[userId+msgId]; ok {
		return
	}
	return nil, errors.New("not found")
}
