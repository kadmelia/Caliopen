/*
 * // Copyleft (ɔ) 2018 The Caliopen contributors.
 * // Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
 * // license (AGPL) that can be found in the LICENSE file.
 */

package store

import (
	"errors"
	. "github.com/CaliOpen/Caliopen/src/backend/defs/go-objects"
	log "github.com/Sirupsen/logrus"
	"github.com/gocassa/gocassa"
	"strings"
	"time"
)

func (cb *CassandraBackend) PutNotificationInQueue(notif *Notification) error {

	var ttl NotificationTTL

	// TODO: find a way to avoid retrieving duration from cassandra for each Put
	err := cb.Session.Query(`SELECT * FROM notification_ttl WHERE ttl_code = ?`, notif.TTLcode).Scan(&ttl.TTLcode, &ttl.Description, &ttl.TTLduration)
	if err != nil {
		log.WithError(err).Error("[CassandraBackend]PutNotificationInQueue failed to retrieve ttl")
		return err
	}

	notifT := cb.IKeyspace.Table("notification", &NotificationModel{}, gocassa.Keys{
		PartitionKeys: []string{"user_id", "notif_id"},
	}).WithOptions(gocassa.Options{TableName: "notification"})

	n := NotificationModel{
		Body:      notif.Body,
		Emitter:   notif.Emitter,
		NotifId:   notif.NotifId.String(),
		Reference: notif.Reference,
		Type:      notif.Type,
		UserId:    notif.User.UserId.String(),
	}

	return notifT.Set(&n).WithOptions(gocassa.Options{TTL: time.Duration(ttl.TTLduration) * time.Second}).Run()
}

func (cb *CassandraBackend) RetrieveNotifications(userId string, from, to time.Time) ([]Notification, error) {

	var query_builder strings.Builder
	values := []interface{}{userId}
	notifs := []Notification{}

	query_builder.WriteString(`SELECT * FROM notification WHERE user_id = ?`)

	if !from.IsZero() {
		query_builder.WriteString(` AND notif_id > minTimeuuid(?)`)
		values = append(values, from)
	}

	if !to.IsZero() {
		query_builder.WriteString(` AND notif_id < maxTimeuuid(?)`)
		values = append(values, to)
	}

	notifs_found, err := cb.Session.Query(query_builder.String(), values...).Iter().SliceMap()
	if err != nil {
		return notifs, err
	}
	if len(notifs_found) == 0 {
		return []Notification{}, errors.New("notifications not found")
	}

	for _, notif := range notifs_found {
		n := new(Notification)
		n.UnmarshalCQLMap(notif)
		notifs = append(notifs, *n)
	}

	return notifs, nil
}

func (cb *CassandraBackend) DeleteNotifications(userId string, until time.Time) error {

	var query_builder strings.Builder
	values := []interface{}{userId}

	query_builder.WriteString(`DELETE FROM notification WHERE user_id = ?`)

	if !until.IsZero() {
		query_builder.WriteString(` AND notif_id < maxTimeuuid(?)`)
		values = append(values, until)
	}

	return cb.Session.Query(query_builder.String(), values...).Exec()
}
