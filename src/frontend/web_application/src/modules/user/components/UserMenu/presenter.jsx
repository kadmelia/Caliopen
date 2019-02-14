import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Trans } from '@lingui/react';
import UserInfo from '../UserInfo';
import { Link, Button, Icon, Dropdown, withDropdownControl, VerticalMenu, VerticalMenuItem, Separator } from '../../../../components/';
import './style.scss';

const DropdownControl = withDropdownControl(Button);

class Presenter extends Component {
  static propTypes = {
    user: PropTypes.shape({}),
    getUser: PropTypes.func.isRequired,
  };

  static defaultProps = {
    user: {},
  };

  state = {
    isDropdownOpen: false,
  };

  componentDidMount() {
    this.props.getUser();
  }

  handleDropdownToggle = (isDropdownOpen) => {
    this.setState({ isDropdownOpen });
  };

  render() {
    const { user } = this.props;

    return (
      <div className="m-user-menu">
        <DropdownControl toggleId="co-user-menu" icon="user" display="inline-block">
          <span className="m-user-menu__button-label">{user && user.name}</span>&nbsp;
          <Icon type={this.state.isDropdownOpen ? 'caret-up' : 'caret-down'} />
        </DropdownControl>
        <Dropdown
          id="co-user-menu"
          alignRight
          isMenu
          hasTriangle
          closeOnClick="all"
          onToggle={this.handleDropdownToggle}
        >
          <VerticalMenu>
            <VerticalMenuItem>
              <UserInfo className="m-user-menu__user-info" />
            </VerticalMenuItem>
            <Separator />
            <VerticalMenuItem>
              <Link to="/contacts" expanded button><Trans id="header.menu.contacts">Contacts</Trans></Link>
            </VerticalMenuItem>
            <VerticalMenuItem>
              <Link to="/user/profile" expanded button><Trans id="header.menu.account">Account</Trans></Link>
            </VerticalMenuItem>
            <VerticalMenuItem>
              <Link to="/settings/application" expanded button><Trans id="header.menu.settings">Settings</Trans></Link>
            </VerticalMenuItem>
            <VerticalMenuItem>
              {user && (
                <Link href="/auth/signout" button expanded><Trans id="header.menu.signout">Signout</Trans></Link>
              )}
              {!user && (
                <Link to="/auth/signin" button expanded><Trans id="header.menu.signin">Signin</Trans></Link>
              )}
            </VerticalMenuItem>
          </VerticalMenu>
        </Dropdown>
      </div>
    );
  }
}

export default Presenter;
