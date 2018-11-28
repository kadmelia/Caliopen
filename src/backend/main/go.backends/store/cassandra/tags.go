// Copyleft (ɔ) 2017 The Caliopen contributors.
// Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
// license (AGPL) that can be found in the LICENSE file.

package store

import (
	"errors"
	. "github.com/CaliOpen/Caliopen/src/backend/defs/go-objects"
	"github.com/gocql/gocql"
	"time"
)

// retrieve tags of type 'user' belonging to user_id
func (cb *CassandraBackend) RetrieveUserTags(user_id string) (tags []Tag, err error) {
	all_tags, err := cb.SessionQuery(`SELECT * FROM user_tag WHERE user_id = ?`, user_id).Iter().SliceMap()
	if err != nil {
		return
	}
	if len(all_tags) == 0 {
		err = errors.New("tags not found")
		return
	}
	for _, tag := range all_tags {
		t := new(Tag)
		t.UnmarshalCQLMap(tag)
		tags = append(tags, *t)
	}
	return
}

// CreateTag inserts Tag into db
func (cb *CassandraBackend) CreateTag(tag *Tag) error {

	user_id, _ := gocql.UUIDFromBytes((*tag).User_id.Bytes())
	(*tag).Date_insert = time.Now()
	(*tag).Type = TagType(UserTag)
	return cb.SessionQuery(`INSERT INTO user_tag (user_id, name, date_insert, importance_level, label, type) VALUES (?,?,?,?,?,?)`,
		user_id,
		(*tag).Name,
		(*tag).Date_insert,
		(*tag).Importance_level,
		(*tag).Label,
		(*tag).Type).Exec()
}

func (cb *CassandraBackend) RetrieveTag(user_id, name string) (tag Tag, err error) {
	tags, err := cb.SessionQuery(`SELECT * FROM user_tag WHERE user_id = ? AND name = ?`, user_id, name).Iter().SliceMap()
	if err != nil {
		return
	}
	if len(tags) == 0 {
		err = errors.New("tag not found")
		return
	}
	tag = Tag{}
	err = tag.UnmarshalCQLMap(tags[0])
	if err != nil {
		return
	}
	return tag, nil
}

func (cb *CassandraBackend) UpdateTag(tag *Tag) error {
	return cb.SessionQuery(`UPDATE user_tag SET importance_level = ?, label = ?, type = ? WHERE user_id = ? AND name = ?`,
		tag.Importance_level,
		tag.Label,
		tag.Type,
		tag.User_id,
		tag.Name,
	).Exec()

}

func (cb *CassandraBackend) DeleteTag(user_id, name string) error {
	return cb.SessionQuery(`DELETE FROM user_tag WHERE user_id = ? AND name = ?`, user_id, name).Exec()
}
