import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { setPassphrase } from '../../../../store/modules/encryption';

const mapDispatchToProps = (dispatch, ownProps) => ({
  onSubmit: passphrase =>
    dispatch(setPassphrase({ passphrase, fingerprint: ownProps.fingerprint })),
});

@connect(null, mapDispatchToProps)
class AskPassphraseForm extends Component {
  static propTypes = {
    fingerprint: PropTypes.string.isRequired,
    onSubmit: PropTypes.func.isRequired,
  };

  render() {
    const { fingerprint, onSubmit } = this.props;

    return (
      <form className="m-AskPassphrase" onSubmit={onSubmit}>
        <label htmlFor={`ask-passphrase-${fingerprint}`}>{fingerprint}</label>
        <input type="password" id={`ask-passphrase-${fingerprint}`} />
      </form>
    );
  }
}

export default AskPassphraseForm;
