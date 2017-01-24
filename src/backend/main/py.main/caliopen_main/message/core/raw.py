# -*- coding: utf-8 -*-
"""Caliopen core raw message class."""
from __future__ import absolute_import, print_function, unicode_literals

import uuid
import logging

from caliopen_storage.core import BaseUserCore, BaseCore
from caliopen_storage.exception import NotFound

from ..store import (RawMessage as ModelRaw,
                     RawInboundMessage as ModelRawInbound,
                     UserRawInboundMessage as ModelUserRawInboundMessage)
from ..format import MailMessage

log = logging.getLogger(__name__)


class RawMessage(BaseUserCore):

    """
    Raw message core.

    Store in binary form any message before processing
    """

    _model_class = ModelRaw
    _pkey_name = 'raw_msg_id'

    @classmethod
    def create(cls, user, raw):
        """Create raw message."""
        key = uuid.uuid4()
        return super(RawMessage, cls).create(user, raw_msg_id=key, data=raw)

    @classmethod
    def get(cls, user, raw_msg_id):
        """Get raw message by raw_msg_id."""
        try:
            return super(RawMessage, cls).get(user, raw_msg_id)
        except NotFound:
            return None

    def parse(self):
        """Parse raw message to get a formatted object."""
        return MailMessage(self.data)


class UserRawInboundMessage(BaseUserCore):

    """User raw message affectation."""

    _model_class = ModelUserRawInboundMessage
    _pkey_name = 'raw_msg_id'


class RawInboundMessage(BaseCore):

    """
    Raw Inbound message core.

    Store in binary form any message before processing
    """

    _model_class = ModelRawInbound
    _pkey_name = 'raw_msg_id'

    @classmethod
    def create(cls, users, raw):
        """Create raw message."""
        raw = super(RawInboundMessage, cls).create(data=raw)
        for user in users:
            UserRawInboundMessage.create(user=user,
                                         raw_msg_id=raw.raw_msg_id)
        return raw

    @classmethod
    def get(cls, raw_msg_id):
        """Get raw message by raw_msg_id."""
        try:
            return super(RawInboundMessage, cls).get(raw_msg_id)
        except NotFound:
            return None

    def parse(self):
        """Parse raw message to get a formatted object."""
        return MailMessage(self.data)
