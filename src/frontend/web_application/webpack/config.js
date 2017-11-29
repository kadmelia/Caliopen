const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackHarddiskPlugin = require('html-webpack-harddisk-plugin');
const { CommonsChunkPlugin } = require('webpack').optimize;
// const StyleLintPlugin = require('stylelint-webpack-plugin');
const clientOptions = require('../config/client.default.js');

const workspacesRootDirectory = path.resolve(__dirname, '../../../../');

const configureStylesheet = (filename = 'client_[name]', relativePath = '') => {
  const extractTextPlugin = new ExtractTextPlugin({
    filename: relativePath + filename,
    allChunks: true,
  });

  return {
    plugins: [
      extractTextPlugin,
      new OptimizeCssAssetsPlugin({
        canPrint: false,
      }),
      // new StyleLintPlugin()
    ],
    module: {
      rules: [
        {
          test: /\.css$/,
          loader: extractTextPlugin.extract({
            fallback: 'style-loader',
            use: [{ loader: 'css-loader', options: { sourceMap: true } }],
          }),
        },
        {
          test: /\.scss$/,
          loader: extractTextPlugin.extract({
            fallback: 'style-loader',
            use: [
              { loader: 'css-loader', options: { sourceMap: true } },
              { loader: 'postcss-loader', options: { sourceMap: true } },
              {
                loader: 'sass-loader',
                options: {
                  sourceMap: false,
                  includePaths: [
                    path.resolve(__dirname, '../src'),
                    path.resolve(workspacesRootDirectory, 'node_modules/foundation-sites/scss'),
                    path.resolve(workspacesRootDirectory, 'node_modules/font-awesome/scss'),
                    path.resolve(workspacesRootDirectory, 'node_modules/react-redux-notify/src'),
                  ],
                },
              },
            ],
          }),
        },
      ],
    },
  };
};

const configureAssets = (outputPath = 'assets/') => ({
  module: {
    rules: [
      {
        test: /\.(jpe?g|png|gif)$/i,
        use: [
          {
            loader: 'file-loader',
            options: { hash: 'sha512', digest: 'hex', name: '[name].[ext]', outputPath },
          },
          {
            loader: 'image-webpack-loader',
            options: { bypassOnDebug: true, optimizationLevel: 7, interlaced: false },
          },
        ],
      },
      { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader', options: { mimetype: 'image/svg+xml', name: '[name].[ext]', outputPath } },
      { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader', options: { mimetype: 'application/font-woff', name: '[name].[ext]', outputPath } },
      { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader', options: { mimetype: 'application/font-woff', name: '[name].[ext]', outputPath } },
      { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader', options: { mimetype: 'application/octet-stream', name: '[name].[ext]', outputPath } },
      { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader', options: { name: '[name].[ext]', outputPath } },
    ],
  },
});

const configureVendorSplit = () => ({
  entry: {
    vendor: [
      '@gandi/react-translate',
      'async-validator',
      'axios',
      'classnames',
      'history',
      'lodash.debounce',
      'lodash.isequal',
      'lodash.throttle',
      'moment-timezone',
      'prop-types',
      'rc-slider',
      'react',
      'react-country-region-selector',
      'react-datepicker',
      'react-dom',
      'react-modal',
      'react-moment',
      'react-redux',
      'react-redux-notify',
      'react-router-dom',
      'react-router-redux',
      'react-tappable',
      'redux',
      'redux-axios-middleware',
      'redux-form',
      'reselect',
      'uuid',
      'xregexp',
    ],
  },
  plugins: [
    new CommonsChunkPlugin({ names: ['vendor', 'manifest'] }),
  ],
});

const configureHTMLTemplate = () => ({
  plugins: [
    new HtmlWebpackPlugin({
      filename: path.resolve(__dirname, '../dist/server/template.html'),
      template: path.resolve(__dirname, '../template/index.ejs'),
      alwaysWriteToDisk: true,
    }),
    new HtmlWebpackHarddiskPlugin(),
  ],
});

const configureEnv = (buildTarget, isNode = false) => {
  const defined = Object.assign({
    BUILD_TARGET: JSON.stringify(buildTarget),
    HAS_SSR: process.env.HAS_SSR || true,
    CALIOPEN_ENV: JSON.stringify(process.env.NODE_ENV),
    CALIOPEN_OPTIONS: JSON.stringify(clientOptions),
  }, isNode ? {} : {
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV),
    },
  });

  return {
    plugins: [
      new webpack.DefinePlugin(defined),
    ],
  };
};

module.exports = {
  configureStylesheet,
  configureAssets,
  configureVendorSplit,
  configureHTMLTemplate,
  configureEnv,
};
