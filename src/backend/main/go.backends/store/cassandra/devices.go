/*
 * // Copyleft (ɔ) 2018 The Caliopen contributors.
 * // Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
 * // license (AGPL) that can be found in the LICENSE file.
 */

// Copyleft (ɔ) 2017 The Caliopen contributors.
// Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
// license (AGPL) that can be found in the LICENSE file.

package store

import (
	"errors"
	"fmt"
	. "github.com/CaliOpen/Caliopen/src/backend/defs/go-objects"
	log "github.com/Sirupsen/logrus"
	"github.com/gocassa/gocassa"
	"gopkg.in/oleiade/reflections.v1"
)

func (cb *CassandraBackend) CreateDevice(device *Device) error {

	deviceT := cb.IKeyspace.Table("device", &Device{}, gocassa.Keys{
		PartitionKeys: []string{"user_id", "device_id"},
	}).WithOptions(gocassa.Options{TableName: "device"})

	//save device
	err := deviceT.Set(device).Run()
	if err != nil {
		return fmt.Errorf("[CassandraBackend] CreateContact: %s", err)
	}

	isNew := true

	// create related rows in joinde tables (if any)
	go func(*CassandraBackend, *Device, bool) {
		err = cb.UpdateRelated(device, nil, isNew)
		if err != nil {
			log.WithError(err).Error("[CassandraBackend] CreateDevice : failed to UpdateRelated")
		}
	}(cb, device, isNew)

	/*** NO LOOKUPS for now, code below will be uncommented if needed ***/
	// create related rows in relevant lookup tables (if any)
	/*
		go func(*CassandraBackend, *Device, bool) {
			err = cb.UpdateLookups(device, nil, isNew)
			if err != nil {
				log.WithError(err).Error("[CassandraBackend] CreateDevice : failed to UpdateLookups")
			}
		}(cb, device, isNew)
	*/
	return nil
}

// retrieve devices belonging to user_id
func (cb *CassandraBackend) RetrieveDevices(userId string) (devices []Device, err error) {
	all_devices, err := cb.SessionQuery(`SELECT * FROM device WHERE user_id = ?`, userId).Iter().SliceMap()
	if err != nil {
		return
	}
	if len(all_devices) == 0 {
		err = errors.New("devices not found")
		return
	}
	for _, device := range all_devices {
		d := new(Device).NewEmpty().(*Device)
		d.UnmarshalCQLMap(device)
		// embed objects from joined tables
		err = cb.RetrieveRelated(d)
		if err != nil {
			log.WithError(err).Error("[CassandraBackend] RetrieveDevice: failed to retrieve related.")
		} else {
			devices = append(devices, *d)
		}
	}
	return
}

func (cb *CassandraBackend) RetrieveDevice(userId, deviceId string) (device *Device, err error) {

	device = new(Device).NewEmpty().(*Device)
	d := map[string]interface{}{}
	q := cb.SessionQuery(`SELECT * FROM device WHERE user_id = ? AND device_id = ?`, userId, deviceId)
	err = q.MapScan(d)
	if err != nil {
		return nil, err
	}
	if len(d) == 0 {
		err = errors.New("not found")
		return nil, err
	}
	device.UnmarshalCQLMap(d)

	// embed objects from joined tables
	err = cb.RetrieveRelated(device)
	if err != nil {
		log.WithError(err).Error("[CassandraBackend] RetrieveDevice: failed to retrieve related.")
	}

	return device, nil
}

func (cb *CassandraBackend) UpdateDevice(device, oldDevice *Device, fields map[string]interface{}) error {

	//get cassandra's field name for each field to modify
	cassaFields := map[string]interface{}{}
	for field, value := range fields {
		cassaField, err := reflections.GetFieldTag(device, field, "cql")
		if err != nil {
			return fmt.Errorf("[CassandraBackend] UpdateDevice failed to find a cql field for object field %s", field)
		}
		if cassaField != "-" {
			cassaFields[cassaField] = value
		}
	}

	deviceT := cb.IKeyspace.Table("device", &Device{}, gocassa.Keys{
		PartitionKeys: []string{"user_id", "device_id"},
	}).WithOptions(gocassa.Options{TableName: "device"}) // need to overwrite default gocassa table naming convention

	err := deviceT.
		Where(gocassa.Eq("user_id", device.UserId.String()), gocassa.Eq("device_id", device.DeviceId.String())).
		Update(cassaFields).
		Run()
	isNew := false

	// update related rows in joined tables
	go func(cb *CassandraBackend, new, old *Device, isNew bool) {
		err = cb.UpdateRelated(device, oldDevice, isNew)
		if err != nil {
			log.WithError(err).Error("[CassandraBackend] Updatedevice : failed to UpdateRelated")
		}
	}(cb, device, oldDevice, isNew)

	// update related rows in relevant lookup tables
	/*** no lookups for now
		go func(cb *CassandraBackend, new, old *Device, isNew bool) {
			err = cb.UpdateLookups(device, oldDevice, isNew)
			if err != nil {
				log.WithError(err).Error("[CassandraBackend] Updatedevice : failed to UpdateLookups")
			}
		}(cb, device, oldDevice, isNew)
	  ***/
	return nil
}

func (cb *CassandraBackend) DeleteDevice(device *Device) error {
	// (hard) delete device. TODO: soft delete
	err := cb.SessionQuery(`DELETE FROM device WHERE user_id = ? AND device_id = ?`, device.UserId.String(), device.DeviceId.String()).Exec()
	if err != nil {
		return err
	}

	// delete related rows in joined tables
	go func(*CassandraBackend, *Device) {
		err = cb.DeleteRelated(device)
		if err != nil {
			log.WithError(err).Error("[CassandraBackend] DeleteDevice: failed to delete related")
		}
	}(cb, device)

	// delete related rows in relevant lookup tables
	/*** no lookups for now
	go func(*CassandraBackend, *Device) {
		err = cb.DeleteLookups(device)
		if err != nil {
			log.WithError(err).Error("[CassandraBackend] Deletedevice: failed to delete lookups")
		}
	}(cb, device)
	***/
	return nil
}
