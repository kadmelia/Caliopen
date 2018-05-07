import { compose } from 'redux';
import { withI18n } from 'lingui-react';
import { withNotification } from '../../../../hoc/notification';
import Presenter from './presenter';

export default compose(
  withI18n(),
  withNotification(),
)(Presenter);
