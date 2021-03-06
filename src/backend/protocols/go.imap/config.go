/*
 * // Copyleft (ɔ) 2018 The Caliopen contributors.
 * // Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
 * // license (AGPL) that can be found in the LICENSE file.
 */

package imap_worker

import (
	. "github.com/CaliOpen/Caliopen/src/backend/defs/go-objects"
)

type (
	WorkerConfig struct {
		Hostname         string      `mapstructure:"hostname"`
		NatsQueue        string      `mapstructure:"nats_queue"`
		NatsTopicFetcher string      `mapstructure:"nats_topic_fetcher"`
		NatsTopicSender  string      `mapstructure:"nats_topic_sender"`
		NatsUrl          string      `mapstructure:"nats_url"`
		StoreName        string      `mapstructure:"store_name"`
		Workers          uint8       `mapstructure:"workers"`
		StoreConfig      StoreConfig `mapstructure:"store_settings"`
		LDAConfig        LDAConfig   `mapstructure:"LDAConfig"`
	}
)

const failuresThreshold = 48 // how many hours to wait before disabling a faulty remote.
