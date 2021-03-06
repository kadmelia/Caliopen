import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Trans } from '@lingui/react';
import { Button, Spinner } from '../../../../components';
import Message from '../../components/Message';
import ProtocolSwitch from '../../components/ProtocolSwitch';
import { getAveragePI } from '../../../../modules/pi';
import { withSettings } from '../../../../modules/settings';

import './style.scss';

@withSettings()
class MessageList extends Component {
  static propTypes = {
    messages: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    loadMore: PropTypes.func,
    hasMore: PropTypes.bool,
    scrollToTarget: PropTypes.func,
    isFetching: PropTypes.bool.isRequired,
    onMessageRead: PropTypes.func.isRequired,
    onMessageUnread: PropTypes.func.isRequired,
    onMessageDelete: PropTypes.func.isRequired,
    user: PropTypes.shape({}),
    isUserFetching: PropTypes.bool.isRequired,
    hash: PropTypes.string,
    settings: PropTypes.shape({}).isRequired,
  };

  static defaultProps = {
    scrollToTarget: undefined,
    hash: undefined,
    loadMore: undefined,
    hasMore: false,
    user: undefined,
  };

  findMessageBefore(message) {
    const { messages } = this.props;
    const index = messages.indexOf(message) - 1;

    return messages[index];
  }

  renderLoadMore() {
    const {
      hasMore, loadMore, isFetching, isUserFetching, user,
    } = this.props;
    const waitingForUser = !user || isUserFetching;

    return (loadMore && !(isFetching || waitingForUser) && hasMore) && (
      <Button shape="hollow" onClick={loadMore}><Trans id="general.action.load_more">Load more</Trans></Button>
    );
  }

  renderList() {
    const {
      messages, onMessageRead, onMessageUnread, onMessageDelete,
      hash, scrollToTarget, user, settings,
    } = this.props;

    const messageList = [];

    return (messages.length > 0) && messages.reduce((acc, message) => {
      if (message.protocol !== 'email' && messageList.length > 0
        && this.findMessageBefore(message).protocol !== message.protocol) {
        messageList.push(<ProtocolSwitch
          newProtocol={message.protocol}
          pi={getAveragePI(message.pi)}
          date={message.date}
          key={`switch-${message.message_id}`}
          settings={settings}
        />);
      }

      messageList.push(<Message
        onMessageRead={onMessageRead}
        onMessageUnread={onMessageUnread}
        onMessageDelete={onMessageDelete}
        message={message}
        key={message.message_id}
        scrollToMe={message.message_id === hash ? scrollToTarget : undefined}
        user={user}
        settings={settings}
      />);

      return messageList;
    }, messageList);
  }

  render() {
    const {
      isFetching, isUserFetching, user,
    } = this.props;
    const waitingForUser = !user || isUserFetching;

    return (
      <div className="m-message-list">
        <Spinner className="m-message-list__spinner" isLoading={isFetching || waitingForUser} />
        <div className="m-message-list__load-more">
          {this.renderLoadMore()}
        </div>
        {waitingForUser ? null : this.renderList()}
      </div>
    );
  }
}

export default MessageList;
