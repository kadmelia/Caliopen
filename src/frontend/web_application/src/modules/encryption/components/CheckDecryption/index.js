import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';

const encryptionSelector = state => state.encryption;
const lockedMessagesSelector = createSelector([encryptionSelector],
  (encryptionState) => ({
    
  });
);

const mapStateToProps = (state, ownProps) => ({
  lockedMessagesByKey: lockedMessagesSelector,
  keyLessMessages: keyLessMessagesSelector,
});

class CheckDecryption extends Component {
  static propTypes = {
    messages: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    lockedMessagesByKey: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    keyLessMessages: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  };

  render() {
    const { messages, lockedMessagesByKey, keyLessMessages } = this.props;

    return (
      <div />
    );
  }
}
