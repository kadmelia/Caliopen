// Copyleft (ɔ) 2019 The Mailden contributors.
// Use of this source code is governed by a GNU GENERAL PUBLIC
// license (GPL) that can be found in the LICENSE file.

// Package backendstest provides utilities and interfaces for mocking backends interfaces
package backendstest

import (
	. "github.com/CaliOpen/Caliopen/src/backend/defs/go-objects"
	"github.com/satori/go.uuid"
	"time"
)

const (
	DevIdoireUserId = "ede04443-b60f-4869-9040-20bd6b1e33c1"
	EmmaTommeUserId = "7f8329c4-e220-45fc-89b2-d8535df69e83"
	JeanThubUserId  = "b26908c5-c32a-4301-8f79-80abf0d8f8fe"
)

var (
	localIdentities = map[string]*UserIdentity{
		DevIdoireUserId + "3fc38dde-1f11-42c0-a489-361d13caebac": {
			DisplayName: "Dev Idoire",
			Id:          UUID(uuid.FromStringOrNil("3fc38dde-1f11-42c0-a489-361d13caebac")),
			Identifier:  "idoire@caliopen.local",
			Infos: map[string]string{
				"lastseenuid":  "",
				"lastsync":     "",
				"inserver":     "",
				"outserver":    "",
				"uidvalidity":  "",
				"pollinterval": "15",
			},
			LastCheck: time.Now(),
			Protocol:  "email",
			Status:    "active",
			Type:      "local",
			UserId:    UUID(uuid.FromStringOrNil(DevIdoireUserId)),
		},
		EmmaTommeUserId + "cd1e6f68-163b-4fe6-8107-f10d140d3c35": {
			DisplayName: "Emma Tomme",
			Id:          UUID(uuid.FromStringOrNil("cd1e6f68-163b-4fe6-8107-f10d140d3c35")),
			Identifier:  "emmatomme@caliopen.local",
			Infos: map[string]string{
				"lastseenuid":  "",
				"lastsync":     "",
				"inserver":     "",
				"outserver":    "",
				"uidvalidity":  "",
				"pollinterval": "15",
			},
			LastCheck: time.Now(),
			Protocol:  "email",
			Status:    "active",
			Type:      "local",
			UserId:    UUID(uuid.FromStringOrNil(EmmaTommeUserId)),
		},
		JeanThubUserId + "6817de1c-0cc5-4964-8c47-58699cf783f7": {
			DisplayName: "Jean Thube",
			Id:          UUID(uuid.FromStringOrNil("6817de1c-0cc5-4964-8c47-58699cf783f7")),
			Identifier:  "jeanthube@caliopen.local",
			Infos: map[string]string{
				"lastseenuid":  "",
				"lastsync":     "",
				"inserver":     "",
				"outserver":    "",
				"uidvalidity":  "",
				"pollinterval": "15",
			},
			LastCheck: time.Now(),
			Protocol:  "email",
			Status:    "active",
			Type:      "local",
			UserId:    UUID(uuid.FromStringOrNil(JeanThubUserId)),
		},
	}

	remoteIdentities = map[string]*UserIdentity{
		DevIdoireUserId + "7e356efb-d24c-493a-b558-e58c7ad20ac3": {
			DisplayName: "Dev Idoire email remote",
			Id:          UUID(uuid.FromStringOrNil("7e356efb-d24c-493a-b558-e58c7ad20ac3")),
			Identifier:  "idoire@remote.server",
			Infos: map[string]string{
				"lastseenuid":  "",
				"lastsync":     "",
				"inserver":     "",
				"outserver":    "",
				"uidvalidity":  "",
				"pollinterval": "",
			},
			LastCheck: time.Now(),
			Protocol:  "email",
			Status:    "active",
			Type:      "remote",
			UserId:    UUID(uuid.FromStringOrNil(DevIdoireUserId)),
		},
		EmmaTommeUserId + "7e4eb26d-1b70-4bb3-b556-6c54f046e88e": {
			Credentials: &Credentials{
				"oauh2refreshtoken": "1/MiibIppEIP0LtCxLpbdseVGNYrIqp0JtMwppeRMgbM5",                                                                                     // fake token
				"oauth2accesstoken": "bu32.sLujBrJwWQAoXJ4QMqdAgEOjiBfXu104dgI3fRDBY0bd-KuKeI1f4orAtMoMeBFFf1aJD6F9SEYo2p0hFWSOieyo-ASEqrJ38T4booBAIuWdV2sSMFw8n2bjNasa", // fake token
				"tokenexpiry":       "2019-02-01T16:42:29+01:00",
				"tokentype":         "Bearer",
				"username":          "emmatomme@gmail.com"},
			DisplayName: "Emma Tomme gmail",
			Id:          UUID(uuid.FromStringOrNil("7e4eb26d-1b70-4bb3-b556-6c54f046e88e")),
			Identifier:  "emmatomme@gmail.com",
			Infos: map[string]string{
				"lastseenuid":  "",
				"lastsync":     "",
				"inserver":     "",
				"outserver":    "",
				"uidvalidity":  "",
				"pollinterval": "5",
			},
			LastCheck: time.Now(),
			Protocol:  "email",
			Status:    "active",
			Type:      "remote",
			UserId:    UUID(uuid.FromStringOrNil(EmmaTommeUserId)),
		},
		EmmaTommeUserId + "b91f0fa8-17a2-4729-8a5a-5ff58ee5c121": {
			Credentials: &Credentials{
				"secret": "b65ebjh9ACNFlhYwCByl0PEEAyU3wtNqOapplEwWuUEBl",      // fake secret
				"token":  "8977654370-cooB2ALLcP4OaejKk7g4lstpommuapp3Kki3dIU", // fake token
			},
			DisplayName: "Emma Tomme twitter remote",
			Id:          UUID(uuid.FromStringOrNil("b91f0fa8-17a2-4729-8a5a-5ff58ee5c121")),
			Identifier:  "emmatomme",
			Infos: map[string]string{
				"lastseenuid":  "",
				"lastsync":     "",
				"inserver":     "",
				"outserver":    "",
				"uidvalidity":  "",
				"pollinterval": "5",
			},
			LastCheck: time.Now(),
			Protocol:  "twitter",
			Status:    "active",
			Type:      "remote",
			UserId:    UUID(uuid.FromStringOrNil(EmmaTommeUserId)),
		},
		JeanThubUserId + "a87b1a18-23e7-6744-8a5a-3ee71ee5c001": {
			DisplayName: "Jean Thube inactive remote",
			Id:          UUID(uuid.FromStringOrNil("a87b1a18-23e7-6744-8a5a-3ee71ee5c001")),
			Identifier:  "jeanthube",
			Infos: map[string]string{
				"lastseenuid":  "",
				"lastsync":     "",
				"inserver":     "",
				"outserver":    "",
				"uidvalidity":  "",
				"pollinterval": "5",
			},
			LastCheck: time.Now(),
			Protocol:  "twitter",
			Status:    "inactive",
			Type:      "remote",
			UserId:    UUID(uuid.FromStringOrNil(JeanThubUserId)),
		},
	}
)

func LocalsCount() int {
	return len(localIdentities)
}

func RemotesCount() int {
	return len(remoteIdentities)
}

func ActiveRemotesCount() int {
	var c int
	for _, remote := range remoteIdentities {
		if remote.Status == "active" {
			c += 1
		}
	}
	return c
}
