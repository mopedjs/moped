const createFileRule = require('@moped/rule-file');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: __dirname + '/src/index.js',
  output: {
    path: __dirname + '/build',
    filename: 'static/js/[name].[chunkhash:8].js',
    publicPath: '/',
  },
  module: {
    rules: [],
  },
  plugins: [new HtmlWebpackPlugin()],
};
