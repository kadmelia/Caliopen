import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Moment from 'react-moment';
import classnames from 'classnames';
import { Trans } from 'lingui-react';
import Link from '../../../../components/Link';
import ContactAvatarLetter from '../../../../components/ContactAvatarLetter';

import './style.scss';

class ProfileInfo extends PureComponent {
  static propTypes = {
    user: PropTypes.shape({}),
    className: PropTypes.string,
    locale: PropTypes.string,
  };

  static defaultProps = {
    user: undefined,
    className: undefined,
    locale: undefined,
  };

  render() {
    const { user, className, locale } = this.props;

    return (
      <div className={classnames('m-user-profile-details', className)}>
        <div className="m-user-profile-details__header">
          <div className="m-user-profile-details__avatar-wrapper">
            {user && (
              <ContactAvatarLetter
                contact={user.contact}
                className="m-user-profile-details__avatar"
              />
            )}
          </div>
        </div>
        <div className="m-user-profile-details__name">
          <h3 className="m-user-profile-details__title">{user && user.name}</h3>
          <h4 className="m-user-profile-details__subtitle">
            {user && `${user.given_name}${user.given_name} ${user.family_name}`}
          </h4>
          <p><Trans id="user.profile.subscribed_date">Subscribed on</Trans>
            {user && (
              <Moment
                className="m-user-profile-details__subscribed-date"
                format="ll"
                locale={locale}
              >{user.date_insert}</Moment>
            )}
          </p>
        </div>

        <div className="m-user-profile-details__rank">
          <div className="m-user-profile-details__rank-badge" />
          <div className="m-user-profile-details__rank-info">
            <h4 className="m-user-profile-details__rank-title">fake rank</h4>
            <Link to=""><Trans id="user.action.improve_rank">Improve rank</Trans></Link>
          </div>
        </div>
      </div>
    );
  }
}

export default ProfileInfo;
