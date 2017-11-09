const EnvPlugin = require('@moped/plugin-env');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: __dirname + '/src/index.js',
  output: {
    path: __dirname + '/build',
    filename: 'static/js/[name].[chunkhash:8].js',
    publicPath: '/',
  },
  plugins: [
    new EnvPlugin({
      JS_ENV_VARIABLE: 'Hello JavaScript',
      HTML_ENV_VARIABLE: 'Hello HTML',
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      inject: true,
      template: __dirname + '/src/index.html',
    }),
  ],
};
