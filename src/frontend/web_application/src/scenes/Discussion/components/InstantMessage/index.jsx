import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Moment from 'react-moment';
import classNames from 'classnames';
import { withI18n } from '@lingui/react';
import { withScrollTarget } from '../../../../modules/scroll';
import { isMessageFromUser, getAuthor, isUserRecipient, getRecipientsExceptUser, getRecipients } from '../../../../services/message';
import { getAveragePI, getPiClass } from '../../../../modules/pi';
import { AuthorAvatarLetter } from '../../../../modules/avatar';
import { Icon } from '../../../../components';
import MessagePi from '../MessagePi';

import './style.scss';

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
    // onMessageRead: PropTypes.func.isRequired,
    // onMessageUnread: PropTypes.func.isRequired,
    // onDeleteMessage: PropTypes.func.isRequired,
    user: PropTypes.shape({}).isRequired,
    scrollTarget: PropTypes.shape({ forwardRef: PropTypes.func }).isRequired,
  };

  getClassNames = (pi, message) => classNames(
    'm-instant-message',
    `${getPiClass(pi)}`,
    { 'm-instant-message--from-user': isMessageFromUser(message, this.props.user) }
  );

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
    const pi = getAveragePI(message.pi);

    return (
      <article className={this.getClassNames(pi, message)} ref={forwardRef}>
        <header className="m-instant-message__author">
          <AuthorAvatarLetter message={message} />
          <Icon type={this.getProtocolIconType(message)} />
          <Moment className="m-instant-message__time" format="HH:mm">{message.date}</Moment>
        </header>
        <aside className="m-instant-message__info">
          <div className="m-instant-message__participants">
            <span className="m-instant-message__participants__from">{author.label}</span>
            <span className="m-instant-message__participants__to">{this.getRecipientsString(true)}<Icon type="caret-down" title={this.getRecipientsString(false)} /></span>
          </div>
          <MessagePi illustrate={false} describe={false} pi={message.pi} />
        </aside>
        <div className="m-instant-message__content">{message.body}</div>
      </article>
    );
  }
}

export default InstantMessage;
