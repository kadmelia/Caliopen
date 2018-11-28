// Copyleft (ɔ) 2017 The Caliopen contributors.
// Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
// license (AGPL) that can be found in the LICENSE file.

package store

import (
	. "github.com/CaliOpen/Caliopen/src/backend/defs/go-objects"
)

// CreateThreadLookup inserts a new entry into discussion_thread_lookup table
func (cb *CassandraBackend) CreateThreadLookup(user_id, discussion_id UUID, external_msg_id string) error {
	return cb.SessionQuery(`INSERT INTO discussion_thread_lookup (user_id, external_root_msg_id, discussion_id) VALUES (?,?,?)`,
		user_id.String(),
		external_msg_id,
		discussion_id.String()).Exec()
}
