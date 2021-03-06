import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Button from '../../../Button';

const ActionBarButton = ({ className, ...props }) => (
  <Button className={classnames('m-action-bar__action-btn', className)}{...props} />
);

ActionBarButton.propTypes = {
  className: PropTypes.string,
};
ActionBarButton.defaultProps = {
  className: undefined,
};

export default ActionBarButton;
