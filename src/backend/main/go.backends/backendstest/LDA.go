// Copyleft (ɔ) 2019 The Caliopen contributors.
// Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
// license (AGPL) that can be found in the LICENSE file.

package backendstest

import (
	"errors"
	. "github.com/CaliOpen/Caliopen/src/backend/defs/go-objects"
	"io"
	"time"
)

type LDAStoreBackend struct {
}

type LDAIndexBackend struct {
}

// GetLDAStoreBackend returns an LDAStoreBackend implementing all LDAStore interfaces
// serving default testdata unless some data are provided in params arrays
func GetLDAStoreBackend() *LDAStoreBackend {
	s := LDAStoreBackend{}
	return &s
}

// GetLDAIndexBackend returns an LDAIndexBackend implementing all LDAIndex interfaces
// serving default testdata unless some data are provided in params arrays
func GetLDAIndexBackend() *LDAIndexBackend {
	i := LDAIndexBackend{}
	return &i
}

func (ldaStore *LDAStoreBackend) Close() {

}

func (ldaStore *LDAStoreBackend) RetrieveMessage(userId, msgId string) (msg *Message, err error) {
	mb := GetMessagesBackend()
	return mb.RetrieveMessage(userId, msgId)
}

func (ldaStore *LDAStoreBackend) GetUsersForLocalMailRecipients([]string) ([][]UUID, error) {
	return nil, errors.New("test interface not implemented")
}

func (ldaStore *LDAStoreBackend) GetSettings(userId string) (settings *Settings, err error) {
	return nil, errors.New("test interface not implemented")
}

func (ldaStore *LDAStoreBackend) CreateMessage(msg *Message) (err error) {
	return errors.New("test interface not implemented")
}

func (ldaStore *LDAStoreBackend) StoreRawMessage(msg RawMessage) (err error) {
	return errors.New("test interface not implemented")
}

func (ldaStore *LDAStoreBackend) GetRawMessage(rawMsgId string) (rawMsg RawMessage, err error) {
	return RawMessage{}, errors.New("test interface not implemented")
}

func (ldaStore *LDAStoreBackend) SetDeliveredStatus(raw_msg_id string, delivered bool) error {
	return errors.New("test interface not implemented")
}
func (ldaStore *LDAStoreBackend) UpdateMessage(msg *Message, fields map[string]interface{}) error {
	return errors.New("test interface not implemented")
}
func (ldaStore *LDAStoreBackend) CreateThreadLookup(user_id, discussion_id UUID, external_msg_id string) error {
	return errors.New("test interface not implemented")
}
func (ldaStore *LDAStoreBackend) SeekMessageByExternalRef(userID, externalMessageID, identityID string) (UUID, error) {
	return EmptyUUID, errors.New("test interface not implemented")
}

func (ldaStore *LDAStoreBackend) LookupContactsByIdentifier(user_id, address string) (contact_ids []string, err error) {
	return nil, errors.New("test interface not implemented")
}

func (ldaStore *LDAStoreBackend) GetAttachment(uri string) (file io.Reader, err error) {
	return nil, errors.New("test interface not implemented")
}
func (ldaStore *LDAStoreBackend) DeleteAttachment(uri string) error {
	return errors.New("test interface not implemented")
}
func (ldaStore *LDAStoreBackend) AttachmentExists(uri string) bool {
	return false
}

func (ldaStore *LDAStoreBackend) RetrieveUserIdentity(userId, identityId string, withCredentials bool) (*UserIdentity, error) {
	ib := GetIdentitiesBackend([]*UserIdentity{}, []*UserIdentity{})
	return ib.RetrieveUserIdentity(userId, identityId, withCredentials)
}
func (ldaStore *LDAStoreBackend) UpdateUserIdentity(userIdentity *UserIdentity, fields map[string]interface{}) error {
	return errors.New("test interface not implemented")
}
func (ldaStore *LDAStoreBackend) RetrieveUser(user_id string) (user *User, err error) {
	return nil, errors.New("test interface not implemented")
}
func (ldaStore *LDAStoreBackend) UpdateRemoteInfosMap(userId, remoteId string, infos map[string]string) error {
	return errors.New("test interface not implemented")
}
func (ldaStore *LDAStoreBackend) RetrieveRemoteInfosMap(userId, remoteId string) (infos map[string]string, err error) {
	return nil, errors.New("test interface not implemented")
}
func (ldaStore *LDAStoreBackend) TimestampRemoteLastCheck(userId, remoteId string, time ...time.Time) error {
	return errors.New("test interface not implemented")
}

func (ldIndex *LDAIndexBackend) Close() {}
func (ldIndex *LDAIndexBackend) CreateMessage(user *UserInfo, msg *Message) error {
	return errors.New("test interface not implemented")
}
func (ldIndex *LDAIndexBackend) UpdateMessage(user *UserInfo, msg *Message, fields map[string]interface{}) error {
	return errors.New("test interface not implemented")
}
