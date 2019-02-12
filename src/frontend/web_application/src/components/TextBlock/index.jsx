import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import './style.scss';

const TextBlock = ({
  inline, nowrap, size, weight, className, ...props
}) => {
  const textBlockClassName = classnames(
    'm-text-block',
    {
      'm-text-block--inline': inline,
      'm-text-block--nowrap': nowrap,
      'm-text-block--small': size === 'small',
      'm-text-block--strong': weight === 'strong',
    },
    className
  );

  return (
    <span className={textBlockClassName} {...props} />
  );
};

TextBlock.propTypes = {
  inline: PropTypes.bool,
  nowrap: PropTypes.bool,
  className: PropTypes.string,
  size: PropTypes.oneOf(['small']),
  weight: PropTypes.oneOf(['strong']),
};
TextBlock.defaultProps = {
  inline: false,
  nowrap: true,
  className: undefined,
  size: null,
  weight: null,
};

export default TextBlock;
