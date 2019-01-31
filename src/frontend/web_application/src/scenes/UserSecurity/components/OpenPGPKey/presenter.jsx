import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Trans, withI18n } from '@lingui/react';
import Moment from 'react-moment';
import { Button, Spinner, Icon, TextareaFieldGroup, DefList } from '../../../../components';
import getPGPManager from '../../../../services/openpgp-manager';
import './style.scss';

async function generateStateFromProps({ props, getKeyFromASCII, keyStatuses }) {
  const publicKey = await getKeyFromASCII(props.publicKeyArmored);
  const { primaryKey: { fingerprint, created, algorithm } } = publicKey;
  const { user: { userId: { userid: userId } } } = await publicKey.getPrimaryUser();
  const { expirationTime } = await publicKey.getExpirationTime();
  const { bits: bitSize } = await publicKey.primaryKey.getAlgorithmInfo();

  return {
    isLoading: false,
    openpgpKey: {
      fingerprint,
      created,
      algorithm,
      userId,
      expirationTime,
      bitSize,
      userIds: publicKey.users.map(user => user.userId.userid),
      keyStatus: Object.keys(keyStatuses)
        .find(statusLiteral => keyStatuses[statusLiteral] === publicKey.verifyPrimaryKey()),
    },
  };
}

@withI18n()
class OpenPGPKey extends Component {
  static propTypes = {
    i18n: PropTypes.shape({}).isRequired,
    locale: PropTypes.string,
    children: PropTypes.node,
    publicKeyArmored: PropTypes.string.isRequired,
    privateKeyArmored: PropTypes.string,
    editMode: PropTypes.bool,
    onDeleteKey: PropTypes.func,
  };

  static defaultProps = {
    locale: undefined,
    children: undefined,
    privateKeyArmored: undefined,
    editMode: false,
    onDeleteKey: () => {},
  };

  constructor(props) {
    super(props);
    this.state = {
      showDetails: false,
      isLoading: true,
      openpgpKey: {
      },
    };

    this.toggleDetails = this.toggleDetails.bind(this);
    this.handleDeleteKey = this.handleDeleteKey.bind(this);
  }

  componentDidMount() {
    getPGPManager()
      .then(async ({ getKeyFromASCII, module: { enums: { keyStatus: keyStatuses } } }) =>
        this.setState(await generateStateFromProps({
          props: this.props, getKeyFromASCII, keyStatuses,
        })));
  }

  componentWillReceiveProps(newProps) {
    getPGPManager()
      .then(async ({ getKeyFromASCII, module: { enums: { keyStatus: keyStatuses } } }) =>
        this.setState(await generateStateFromProps({
          props: newProps, getKeyFromASCII, keyStatuses,
        })));
  }

  handleDeleteKey() {
    this.props.onDeleteKey({ fingerprint: this.state.openpgpKey.fingerprint });
  }

  toggleDetails() {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }));
  }

  render() {
    const {
      i18n, locale, children, publicKeyArmored, privateKeyArmored, editMode,
    } = this.props;
    const openpgpStatuses = {
      invalid: i18n._('openpgp.status.invalid', null, { defaults: 'Invalid' }),
      expired: i18n._('openpgp.status.expired', null, { defaults: 'Expired' }),
      revoked: i18n._('openpgp.status.revoked', null, { defaults: 'Revoked' }),
      valid: i18n._('openpgp.status.valid', null, { defaults: 'Valid' }),
      no_self_cert: i18n._('openpgp.status.no_self_cert', null, { defaults: 'No self cert' }),
    };

    return (
      <div className="m-openpgp-key">
        <div className="m-openpgp-key__main">
          <Spinner isLoading={this.state.isLoading} />
          <div className="m-openpgp-key__icon">{children}</div>
          <div className="m-openpgp-key__fingerprint">{this.state.openpgpKey.fingerprint}</div>

          <div className="m-openpgp-key__actions">
            <Button
              className={classnames({ 'm-openpgp-key__toggle-info--warning': this.state.openpgpKey.keyStatus !== 'valid' })}
              onClick={this.toggleDetails}
            >
              <Icon type="info-circle" />
              {' '}
              <Icon type="caret-down" />
              {' '}
              <span className="show-for-sr"><Trans id="openpgp.action.toggle-details">Toggle details</Trans></span>
            </Button>
            {editMode && (
              <Button color="alert" onClick={this.handleDeleteKey}>
                <Icon type="remove" />
                <span className="show-for-sr"><Trans id="openpgp.action.remove-key">Remove</Trans></span>
              </Button>
            )}
          </div>
        </div>

        {!this.state.showDetails && (
          <div className="m-openpgp-key__summary">
            <span>{this.state.openpgpKey.userId}</span>
            {this.state.openpgpKey.created && (
              <Moment format="ll" locale={locale}>{this.state.openpgpKey.created}</Moment>
            )}
            {' '}
            {this.state.openpgpKey.expirationTime
                && this.state.openpgpKey.expirationTime.length
                && (
                  <span>
                    / <Moment format="ll" locale={locale}>{this.state.openpgpKey.expirationTime}</Moment>
                  </span>
                )
            }
            {' '}
            {this.state.openpgpKey.keyStatus && openpgpStatuses[this.state.openpgpKey.keyStatus]}
          </div>
        )}

        {this.state.showDetails && (
          <div className="m-openpgp-key__details">
            <DefList
              className="m-openpgp-key__detail"
              definitions={[
                { title: i18n._('openpgp.details.identities', null, { defaults: 'Identities' }), descriptions: this.state.openpgpKey.userIds },
                { title: i18n._('openpgp.details.algorithm', null, { defaults: 'Algorithm' }), descriptions: [this.state.openpgpKey.algorithm] },
                { title: i18n._('openpgp.details.key-size', null, { defaults: 'Key size' }), descriptions: [this.state.openpgpKey.bitSize] },
                { title: i18n._('openpgp.details.status', null, { defaults: 'Status' }), descriptions: [openpgpStatuses[this.state.openpgpKey.keyStatus]] },
                { title: i18n._('openpgp.details.creation', null, { defaults: 'Creation' }), descriptions: this.state.openpgpKey.created ? [<Moment format="ll" locale={locale}>{this.state.openpgpKey.created}</Moment>] : [] },
                { title: i18n._('openpgp.details.expiration', null, { defaults: 'Expiration' }), descriptions: this.state.openpgpKey.expirationTime ? [<Moment format="ll" locale={locale}>{this.state.openpgpKey.expirationTime}</Moment>] : [] },
              ]}
            />

            <TextareaFieldGroup
              className="m-openpgp-key__detail"
              label={i18n._('openpgp.public-key', null, { defaults: 'Public key' })}
              inputProps={{
                readOnly: true,
                value: publicKeyArmored,
              }}
            />
            {privateKeyArmored && (
              <TextareaFieldGroup
                className="m-openpgp-key__detail"
                label={i18n._('openpgp.private-key', null, { defaults: 'Private key' })}
                inputProps={{
                  readOnly: true,
                  value: privateKeyArmored,
                }}
              />
            )}
          </div>
        )}
      </div>
    );
  }
}

export default OpenPGPKey;
