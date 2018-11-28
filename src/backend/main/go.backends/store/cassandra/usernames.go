// Copyleft (ɔ) 2017 The Caliopen contributors.
// Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
// license (AGPL) that can be found in the LICENSE file.
//

package store

import (
	. "github.com/CaliOpen/Caliopen/src/backend/defs/go-objects"
	"github.com/CaliOpen/Caliopen/src/backend/main/go.main/helpers"
	log "github.com/Sirupsen/logrus"
	"github.com/gocql/gocql"
)

// UserNameStorage interface implementation for cassandra
func (cb *CassandraBackend) UsernameIsAvailable(username string) (resp bool, err error) {
	resp = false
	err = nil
	lookup := helpers.EscapeUsername(username)
	found := map[string]interface{}{}
	err = cb.SessionQuery(`SELECT COUNT(*) FROM user_name WHERE name = ?`, lookup).MapScan(found)
	if err != nil {
		log.WithError(err).Infof("username lookup error : %v", err)
		return
	}
	if found["count"].(int64) != 0 {
		return
	}
	resp = true
	return
}

// UserByUsername lookups table user_name to get the user_id for the given username
// if a user_id is found, the user is fetched from user table.
func (cb *CassandraBackend) UserByUsername(username string) (user *User, err error) {
	user_id := new(gocql.UUID)
	err = cb.SessionQuery(`SELECT user_id FROM user_name WHERE name = ?`, username).Scan(user_id)
	if err != nil || len(user_id.Bytes()) == 0 {
		return nil, err
	}
	return cb.RetrieveUser(user_id.String())
}
