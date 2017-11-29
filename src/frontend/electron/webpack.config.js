const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin');
const webpackMerge = require('webpack-merge');
const configs = require('@caliopen/frontend/webpack/config.js');
const common = require('@caliopen/frontend/webpack/webpack.common.js');

const base = {
  target: 'electron',
  entry: [
    'babel-polyfill',
    'expose-loader?$!expose-loader?jQuery!jquery',
    'script-loader!foundation-sites',
    path.join(__dirname, 'src/index.jsx'),
  ],
  output: {
    path: path.join(__dirname, 'dist/electron/'),
    filename: 'bundle.js',
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: true,
      template: path.join(__dirname, 'template/index.html'),
    }),
  ],
};

const config = webpackMerge(
  common,
  configs.configureEnv('electron'),
  configs.configureStylesheet(),
  configs.configureAssets(),
  base
);

module.exports = config;
