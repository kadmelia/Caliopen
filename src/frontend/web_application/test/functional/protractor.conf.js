const { SpecReporter } = require('jasmine-spec-reporter');

const cfg = {
  SELENIUM_PROMISE_MANAGER: true,
  capabilities: {
    // firefox
    browserName: 'chrome',
    maxInstances: 1,
    chromeOptions: {
      args: ['lang=en-US'],
      prefs: {
        intl: { accept_languages: 'en-US' },
      },
    },
  },
  specs: ['./features/**/*-spec.js'],
  jasmineNodeOpts: {
    showColors: true,
    // print: () => {},
    defaultTimeoutInterval: 50 * 1000,
  },
  baseUrl: 'http://localhost:4000/',
  onPrepare: () => {
    browser.ignoreSynchronization = true;
    jasmine.getEnv().addReporter(new SpecReporter({
      spec: {
        displayErrorMessages: true,
        displayFailed: true,
        displayStacktrace: true,
      },
    }));
  },
  plugins: [
    { package: 'protractor-console-plugin', failOnWarning: false, logWarnings: false, exclude: [/Warning:/] },
  ],
};

if (process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY) {
  // platform config: https://wiki.saucelabs.com/display/DOCS/Platform+Configurator#/
  const branch = (process.env.TRAVIS_PULL_REQUEST_BRANCH.length > 0) ?
    process.env.TRAVIS_PULL_REQUEST_BRANCH :
    process.env.TRAVIS_BRANCH;

  cfg.sauceUser = process.env.SAUCE_USERNAME;
  cfg.sauceKey = process.env.SAUCE_ACCESS_KEY;
  cfg.multiCapabilities = [
    {
      browserName: 'firefox',
      platform: 'Linux',
      // version is 45 max for linux, it requires to not use marionette
      // cf. https://github.com/angular/protractor/blob/master/CHANGELOG.md#breaking-changes-1
      marionette: false,
      version: 'latest',
      'tunnel-identifier': process.env.TRAVIS_JOB_NUMBER,
      build: process.env.TRAVIS_JOB_NUMBER,
      name: `CaliOpen e2e - ${branch}`,
    },
    // {
    //   browserName: 'chrome',
    //   platform: 'Linux',
    //   'tunnel-identifier': process.env.TRAVIS_JOB_NUMBER,
    //   build: process.env.TRAVIS_JOB_NUMBER,
    //   name: `CaliOpen e2e - ${branch}`,
    // },
    // {
    //   browserName: 'Internet Explorer',
    //   plateform: 'Windows 10',
    //   version: 'latest',
    //   'tunnel-identifier': process.env.TRAVIS_JOB_NUMBER,
    //   build: process.env.TRAVIS_JOB_NUMBER,
    //   name: `CaliOpen e2e - ${branch}`,
    // },
    // {
    //   browserName: 'Safari',
    //   plateform: 'OS X 10.11',
    //   version: 'latest ',
    //   'tunnel-identifier': process.env.TRAVIS_JOB_NUMBER,
    //   build: process.env.TRAVIS_JOB_NUMBER,
    //   name: `CaliOpen e2e - ${branch}`,
    // },
  ];
}

exports.config = cfg;
