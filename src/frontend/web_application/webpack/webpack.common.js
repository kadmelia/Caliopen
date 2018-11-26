const path = require('path');

const isDev = process.env.NODE_ENV === 'development';
const mode = isDev ? 'development' : 'production';

module.exports = {
  mode,
  devtool: isDev ? 'eval' : 'source-map',
  entry: {
    app: [],
    vendor: [],
  },
  output: {},
  plugins: [],
  module: {
    rules: [
      {
        test: /(?<!\.worker)\.jsx?$/,
        include: [
          path.join(__dirname, '../src/'),
        ],
        use: [
          { loader: 'babel-loader' },
          {
            loader: 'eslint-loader',
            options: {
              cache: true,
              failOnError: false,
            },
          },
        ],
      },
      {
        test: /\.worker\.js$/,
        use: [
          { loader: 'worker-loader' },
          { loader: 'babel-loader' },
          {
            loader: 'eslint-loader',
            options: {
              cache: true,
              options: { name: 'WorkerName.[hash].js' },
              failOnError: false,
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
};
