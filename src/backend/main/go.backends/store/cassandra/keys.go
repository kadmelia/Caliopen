/*
 * // Copyleft (ɔ) 2018 The Caliopen contributors.
 * // Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
 * // license (AGPL) that can be found in the LICENSE file.
 */

package store

import (
	. "github.com/CaliOpen/Caliopen/src/backend/defs/go-objects"
	"github.com/gocassa/gocassa"
	"gopkg.in/oleiade/reflections.v1"
)

func (cb *CassandraBackend) CreatePGPPubKey(pubkey *PublicKey) CaliopenError {
	// write complete statement because gocassa failed to retrieve tag "use" and write quotes to cassandra
	err := cb.SessionQuery(`UPDATE public_key SET 
	alg = ?,
	crv = ?,
	date_insert = ?,
	date_update = ?,
	expire_date = ?,
	fingerprint = ?,
	key = ?,
	kty = ?,
	label = ?,
	resource_type = ?,
	size = ?,
	"use" = ?,
	x = ?,
	y = ?
	WHERE user_id = ? AND resource_id = ? AND key_id = ?`,
		pubkey.Algorithm,
		pubkey.Curve,
		pubkey.DateInsert,
		pubkey.DateUpdate,
		pubkey.ExpireDate,
		pubkey.Fingerprint,
		pubkey.Key,
		pubkey.KeyType,
		pubkey.Label,
		pubkey.ResourceType,
		pubkey.Size,
		pubkey.Use,
		pubkey.X,
		pubkey.Y,
		pubkey.UserId,
		pubkey.ResourceId,
		pubkey.KeyId).Exec()

	if err != nil {
		return NewCaliopenErrf(DbCaliopenErr, "[CassandraBackend]CreatePGPPubKey db error : %s", err.Error())
	}
	return nil
}

func (cb *CassandraBackend) RetrieveContactPubKeys(userId, contactId string) (keys PublicKeys, err CaliopenError) {
	ks, e := cb.SessionQuery(`SELECT * FROM public_key WHERE user_id = ? AND resource_id = ?`, userId, contactId).Iter().SliceMap()
	if e != nil {
		return nil, WrapCaliopenErrf(e, DbCaliopenErr, "[CassandraBackend]RetrieveContactPubKeys failed")
	}
	for _, k := range ks {
		pubkey := new(PublicKey)
		pubkey.UnmarshalCQLMap(k)
		keys = append(keys, *pubkey)
	}
	return
}

func (cb *CassandraBackend) RetrievePubKey(userId, resourceId, keyId string) (pubkey *PublicKey, err CaliopenError) {
	result := map[string]interface{}{}
	e := cb.SessionQuery(`SELECT * FROM public_key WHERE user_id = ? AND resource_id = ? AND key_id = ?`, userId, resourceId, keyId).MapScan(result)
	if e != nil {
		if e.Error() == "not found" {
			err = WrapCaliopenErr(NewCaliopenErr(NotFoundCaliopenErr, "not found"), DbCaliopenErr, "[CassandraBackend]RetrievePubKey not found in db")
		} else {
			err = NewCaliopenErrf(DbCaliopenErr, "[CassandraBackend]RetrievePubKey returned error from cassandra : %s", e.Error())
		}
		return
	}
	pubkey = new(PublicKey)
	pubkey.UnmarshalCQLMap(result)
	return
}

func (cb *CassandraBackend) UpdatePubKey(newPubKey, oldPubKey *PublicKey, fields map[string]interface{}) CaliopenError {

	//get cassandra's field name for each field to modify
	cassaFields := map[string]interface{}{}
	for field, value := range fields {
		cassaField, err := reflections.GetFieldTag(newPubKey, field, "cql")
		if err != nil {
			return NewCaliopenErrf(FailDependencyCaliopenErr, "[CassandraBackend]UpdatePubKey failed to find a cql field for object field %s", field)
		}
		if cassaField != "-" {
			cassaFields[cassaField] = value
		}
	}

	keyT := cb.IKeyspace.Table("public_key", &PublicKey{}, gocassa.Keys{
		PartitionKeys: []string{"user_id", "resource_id", "key_id"},
	}).WithOptions(gocassa.Options{TableName: "public_key"}) // need to overwrite default gocassa table naming convention

	err := keyT.
		Where(gocassa.Eq("user_id", newPubKey.UserId.String()),
			gocassa.Eq("resource_id", newPubKey.ResourceId.String()),
			gocassa.Eq("key_id", newPubKey.KeyId.String())).
		Update(cassaFields).
		Run()
	if err != nil {
		return NewCaliopenErrf(DbCaliopenErr, "[CassandraBackend]UpdatePubKey failed to call store with cassandra error : %s", err.Error())
	}
	return nil
}

func (cb *CassandraBackend) DeletePubKey(pubkey *PublicKey) CaliopenError {
	e := cb.SessionQuery(`DELETE FROM public_key WHERE user_id = ? AND resource_id = ? AND key_id = ?`, pubkey.UserId, pubkey.ResourceId, pubkey.KeyId).Exec()
	if e != nil {
		return NewCaliopenErrf(DbCaliopenErr, "[CassandraBackend]DeletePubKey returned err from cassandra : %s", e.Error())
	}
	return nil
}
