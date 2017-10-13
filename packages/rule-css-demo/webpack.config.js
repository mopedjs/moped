const ruleCss = require('@moped/rule-css');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const css = ruleCss({
  environment: process.env.NODE_ENV,
  cssFileName: 'static/css/[name].[contenthash:8].css',
  shouldUseRelativeAssetPaths: false,
  shouldUseSourceMap: false,
});

module.exports = {
  entry: __dirname + '/src/index.js',
  output: {
    path: __dirname + '/build',
    filename: 'static/js/[name].[chunkhash:8].js',
    publicPath: '/',
  },
  module: {
    rules: [css.rule],
  },
  plugins: [css.plugin, new HtmlWebpackPlugin()],
};
