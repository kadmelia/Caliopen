import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Moment from 'react-moment';
import classNames from 'classnames';
import { withI18n } from '@lingui/react';
import { withScrollTarget } from '../../../../modules/scroll';
import { isMessageFromUser, getAuthor, isUserRecipient, getRecipientsExceptUser, getRecipients } from '../../../../services/message';
import { getAveragePIMessage, getPiClass } from '../../../../modules/pi';
import { AuthorAvatarLetter } from '../../../../modules/avatar';
import { Icon } from '../../../../components';
import MessagePi from '../MessagePi';

import './style.scss';
import './instant-message-author.scss';
import './instant-message-participants.scss';

const PROTOCOL_ICONS = {
  facebook: 'facebook',
  twitter: 'twitter',
  sms: 'phone',
  email: 'envelope',
  default: 'comment',
};

@withI18n()
@withScrollTarget()
class InstantMessage extends PureComponent {
  static propTypes = {
    message: PropTypes.shape({}).isRequired,
    i18n: PropTypes.shape({}).isRequired,
    // XXX: No UI for that
    // onMessageRead: PropTypes.func,
    // onMessageUnread: PropTypes.func,
    // onDeleteMessage: PropTypes.func,
    // noInteractions: PropTypes.bool,
    user: PropTypes.shape({}).isRequired,
    scrollTarget: PropTypes.shape({ forwardRef: PropTypes.func }).isRequired,
  };

  getProtocolIconType = ({ protocol }) => PROTOCOL_ICONS[protocol] || 'comment';

  getRecipientsString = (shorten) => {
    const { i18n } = this.props;
    const recipients = this.getRecipientsArray();
    const numberRecipients = recipients.length;

    if (numberRecipients === 0) return i18n._('message.participants.me', null, { defaults: 'Me' });
    if (!shorten || numberRecipients === 1) return recipients.join(', ');

    return i18n._('messages.participants.and_x_others', { first: recipients[0], number: numberRecipients - 1 }, { defaults: '{first} and {number, plural, one {# other} other {# others}}' });
  };

  getRecipientsLabels = (recipients) => {
    if (!recipients) return [];

    return recipients.map(recipient =>
      (recipient.label ? recipient.label : recipient.address));
  };

  getRecipientsArray = () => {
    const { message, user, i18n } = this.props;

    return isUserRecipient(message, user) ?
      [
        i18n._('message.participants.me', null, { defaults: 'Me' }),
        ...this.getRecipientsLabels(getRecipientsExceptUser(message, user)),
      ]
      :
      this.getRecipientsLabels(getRecipients(message));
  }

  render() {
    const { message, scrollTarget: { forwardRef } } = this.props;
    const author = getAuthor(message);
    const pi = getAveragePIMessage({ message });

    const articleClassNames = classNames(
      'm-instant-message',
      `${getPiClass(pi)}`,
      { 'm-instant-message--from-user': isMessageFromUser(message, this.props.user) }
    );

    return (
      <article className={articleClassNames} ref={forwardRef}>
        <header className="m-instant-message__author m-instant-message-author">
          <AuthorAvatarLetter message={message} className="m-instant-message-author__avatar" />
          <Icon type={this.getProtocolIconType(message)} />
          <Moment className="m-instant-message-author__time" format="HH:mm">{message.date}</Moment>
        </header>
        <aside className="m-instant-message__info">
          <div className="m-instant-message__participants m-instant-message-participants">
            <span className="m-instant-message-participants__from">{author.label}</span>
            <span className="m-instant-message-participants__to">{this.getRecipientsString(true)}<Icon type="caret-down" title={this.getRecipientsString(false)} /></span>
          </div>
          <MessagePi illustrate={false} describe={false} message={message} />
        </aside>
        <div className="m-instant-message__content">{message.body}</div>
      </article>
    );
  }
}

export default InstantMessage;
