import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Trans } from '@lingui/react';
import { Icon, Button } from '../../../../components/';
import { getPrimaryKeysByFingerprint, saveKey } from '../../../../services/openpgp-keychain-repository';
import { generateKey } from '../../../../services/encryption';
import OpenPGPKey from '../OpenPGPKey';
import OpenPGPKeyForm from '../OpenPGPKeyForm';
import './style.scss';

class OpenPGPKeysDetails extends Component {
  static propTypes = {
    user: PropTypes.shape({}).isRequired,
    isLoading: PropTypes.bool,
  };

  static defaultProps = {
    isLoading: false,
  }

  state = {
    importForm: {},
    editMode: false,
    keys: undefined,
  };

  componentDidMount() {
    getPrimaryKeysByFingerprint()
      .then(keys => this.setState({
        ...this.state,
        keys,
      }));
  }

  getPrivateKeys = () => Object.values(this.state.keys || {});
  getUserEmails = () => {
    const { user: { contact, title } } = this.props;

    if (contact) {
      return contact.emails.map(({ address }) => ({ name: title, email: address }));
    }

    return null;
  }

  handleClickEditMode = () => {
    this.setState(prevState => ({
      editMode: !prevState.editMode,
    }));
  }

  importKeys = async ({ publicKeyArmored, privateKeyArmored }) => {
    const error = await saveKey(publicKeyArmored, privateKeyArmored);

    return error;
  }

  generateAndSaveKeys = async () => {
    const options = {
      userIds: this.getUserEmails(),
      numbits: 4096,
    };

    const { privateKeyArmored, publicKeyArmored } = await generateKey(options);

    const error = await saveKey(publicKeyArmored, privateKeyArmored);

    return error;
  }

  renderPrivateKey = (keyPair, key) => {
    const { onDeleteKey } = this.props;

    return (
      <OpenPGPKey
        key={key}
        className="m-account-openpgp__keys"
        publicKeyArmored={keyPair.publicKeyArmored}
        privateKeyArmored={keyPair.privateKeyArmored}
        editMode={this.state.editMode}
        onDeleteKey={onDeleteKey}
      >
        <Icon type="key" />
      </OpenPGPKey>
    );
  }

  render() {
    const {
      isLoading,
      user,
    } = this.props;

    const activeButtonProp = this.state.editMode ? { color: 'active' } : {};

    return (
      <div className="m-account-openpgp">
        {this.getPrivateKeys().map(this.renderPrivateKey)}
        {this.state.editMode ? (
          <div>
            <OpenPGPKeyForm
              className="m-account-openpgp__form"
              emails={user.contact.emails}
              onImport={this.importKeys}
              onGenerate={this.generateAndSaveKeys}
              importForm={this.state.importForm}
              isLoading={isLoading}
              cancel={this.handleClickEditMode}
            />
            <div className="m-account-openpgp__info">
              <p>
                This feature is in high development process and can evolve quickly.
                The keys you will store here are available on your current browser only.
                This will not be uploaded on the server and you will not able to see it on any
                other devices.
              </p>
              <p>
                Be warned, the key pair generation is pretty slow and will freeze this page for
                approximatively 20 seconds (depends on your device capacities).
                A fix is in progress but may takes time to become available.
              </p>
            </div>
          </div>
        ) :
          <Button
            {...activeButtonProp}
            onClick={this.handleClickEditMode}
            shape="plain"
            icon="plus"
          >
            <Trans id="user.openpgp.action.edit-keys">Edit and add keys</Trans>
          </Button>
        }
      </div>
    );
  }
}

export default OpenPGPKeysDetails;
