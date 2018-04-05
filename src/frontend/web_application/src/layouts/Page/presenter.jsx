import React, { Component } from 'react';
import PropTypes from 'prop-types';
import OffCanvas from './components/OffCanvas';
import Header from './components/Header';
import Navigation from './components/Navigation';
import NavigationAlt from './components/NavigationAlt';
import NotificationCenter from './components/NotificationCenter';
import CallToAction from './components/CallToAction';
import './style.scss';

const BACKGROUND_URLS = {
  secure: '/img/caliopen_bg_secure.jpg',
};

class PageContainer extends Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    requestUser: PropTypes.func.isRequired,
    i18n: PropTypes.shape({}).isRequired,
  };

  componentDidMount() {
    this.props.requestUser();
  }

  render() {
    const { children, i18n } = this.props;
    const fakeContext = 'secure';
    const backgroundStyle = {
      style: {
        backgroundImage: `url(${BACKGROUND_URLS[fakeContext]})`,
      },
    };

    return (
      <OffCanvas leftChildren={<NavigationAlt />}>
        <div className="l-body" {...backgroundStyle}>
          <Header />
          <Navigation />
          <section role="main">
            <div className="l-body__content">{children}</div>
          </section>
          <section>
            <div
              className="l-body__footer-alpha"
              dangerouslySetInnerHTML={{ __html: i18n._('alpha.footer.feedback', { defaults: 'Tell us if something went wrong at <a href="https://feedback.caliopen.org/">https://feedback.caliopen.org/</a>.' }) }}
            />
          </section>
          <CallToAction />
          <NotificationCenter />
        </div>
      </OffCanvas>
    );
  }
}

export default PageContainer;
