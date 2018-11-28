// Copyleft (ɔ) 2017 The Caliopen contributors.
// Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
// license (AGPL) that can be found in the LICENSE file.

package store

import (
	"fmt"
	. "github.com/CaliOpen/Caliopen/src/backend/defs/go-objects"
	log "github.com/Sirupsen/logrus"
	"github.com/gocassa/gocassa"
	"gopkg.in/oleiade/reflections.v1"
)

// CreateContact saves Contact to Cassandra
// AND fills/updates joined and lookup tables
func (cb *CassandraBackend) CreateContact(contact *Contact) error {
	contactT := cb.IKeyspace.Table("contact", &Contact{}, gocassa.Keys{
		PartitionKeys: []string{"user_id", "contact_id"},
	}).WithOptions(gocassa.Options{TableName: "contact"}) // need to overwrite default gocassa table naming convention

	// save contact
	err := contactT.Set(contact).Run()
	if err != nil {
		return fmt.Errorf("[CassandraBackend] CreateContact: %s", err)
	}
	isNew := true

	// create related rows in joined tables
	go func(*CassandraBackend, *Contact, bool) {
		err = cb.UpdateRelated(contact, nil, isNew)
		if err != nil {
			log.WithError(err).Error("[CassandraBackend] CreateContact : failed to UpdateRelated")
		}
	}(cb, contact, isNew)

	// create related rows in relevant lookup tables
	go func(*CassandraBackend, *Contact, bool) {
		err = cb.UpdateLookups(contact, nil, isNew)
		if err != nil {
			log.WithError(err).Error("[CassandraBackend] CreateContact : failed to UpdateLookups")
		}
	}(cb, contact, isNew)

	return nil
}

func (cb *CassandraBackend) RetrieveContact(user_id, contact_id string) (contact *Contact, err error) {

	// retrieve contact
	contact = new(Contact).NewEmpty().(*Contact)
	m := map[string]interface{}{}
	q := cb.SessionQuery(`SELECT * FROM contact WHERE user_id = ? AND contact_id = ?`, user_id, contact_id)
	err = q.MapScan(m)
	if err != nil {
		return nil, err
	}
	contact.UnmarshalCQLMap(m)

	// embed objects from joined tables
	err = cb.RetrieveRelated(contact)
	if err != nil {
		log.WithError(err).Error("[CassandraBackend] RetrieveContact: failed to retrieve related.")
	}

	return contact, err
}

// UpdateContact updates fields into Cassandra
// AND updates related lookup tables if needed
func (cb *CassandraBackend) UpdateContact(contact, oldContact *Contact, fields map[string]interface{}) error {

	//get cassandra's field name for each field to modify
	cassaFields := map[string]interface{}{}
	for field, value := range fields {
		cassaField, err := reflections.GetFieldTag(contact, field, "cql")
		if err != nil {
			return fmt.Errorf("[CassandraBackend] UpdateContact failed to find a cql field for object field %s", field)
		}
		if cassaField != "-" {
			cassaFields[cassaField] = value
		}
	}

	contactT := cb.IKeyspace.Table("contact", &Contact{}, gocassa.Keys{
		PartitionKeys: []string{"user_id", "contact_id"},
	}).WithOptions(gocassa.Options{TableName: "contact"}) // need to overwrite default gocassa table naming convention

	err := contactT.
		Where(gocassa.Eq("user_id", contact.UserId.String()), gocassa.Eq("contact_id", contact.ContactId.String())).
		Update(cassaFields).
		Run()
	isNew := false

	// update related rows in joined tables
	go func(cb *CassandraBackend, new, old *Contact, isNew bool) {
		err = cb.UpdateRelated(contact, oldContact, isNew)
		if err != nil {
			log.WithError(err).Error("[CassandraBackend] UpdateContact : failed to UpdateRelated")
		}
	}(cb, contact, oldContact, isNew)

	// update related rows in relevant lookup tables
	go func(cb *CassandraBackend, new, old *Contact, isNew bool) {
		err = cb.UpdateLookups(contact, oldContact, isNew)
		if err != nil {
			log.WithError(err).Error("[CassandraBackend] UpdateContact : failed to UpdateLookups")
		}
	}(cb, contact, oldContact, isNew)

	return nil
}

// DeleteContact removes Contact from Cassandra
// AND removes contactID from related lookup_tables
func (cb *CassandraBackend) DeleteContact(contact *Contact) error {

	// (hard) delete contact. TODO: soft delete
	err := cb.SessionQuery(`DELETE FROM contact WHERE user_id = ? AND contact_id = ?`, contact.UserId.String(), contact.ContactId.String()).Exec()
	if err != nil {
		return err
	}

	// delete related rows in joined tables
	go func(*CassandraBackend, *Contact) {
		err = cb.DeleteRelated(contact)
		if err != nil {
			log.WithError(err).Error("[CassandraBackend] DeleteContact: failed to delete related")
		}
	}(cb, contact)

	// delete related rows in relevant lookup tables
	go func(*CassandraBackend, *Contact) {
		err = cb.DeleteLookups(contact)
		if err != nil {
			log.WithError(err).Error("[CassandraBackend] DeleteContact: failed to delete lookups")
		}
	}(cb, contact)

	return nil
}

func (cb *CassandraBackend) LookupContactsByIdentifier(user_id, address string) (contact_ids []string, err error) {
	err = cb.SessionQuery(`SELECT contact_ids FROM contact_lookup WHERE user_id=? and value=? and type='email'`, user_id, address).Scan(&contact_ids)
	return
}

// ContactExist exposes a simple API to check if a contact with these uuids exits in db
func (cb *CassandraBackend) ContactExists(userId, contactId string) bool {
	var count int
	err := cb.SessionQuery(`SELECT count(*) FROM contact WHERE user_id = ? AND contact_id = ?`, userId, contactId).Scan(&count)
	if err != nil || count == 0 {
		return false
	}
	return true
}
