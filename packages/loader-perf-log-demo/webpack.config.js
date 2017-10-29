const createTsRule = require('@moped/rule-ts');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const tsRule = createTsRule({
  babelPresets: ['react-app'],
  tsConfigFileName: __dirname + '/tsconfig.build.json',
});

tsRule.use.unshift({loader: '@moped/loader-perf-log', options: 'typescript'});

module.exports = {
  entry: __dirname + '/src/index.tsx',
  output: {
    path: __dirname + '/build',
    filename: 'static/js/[name].[chunkhash:8].js',
    publicPath: '/',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
  },
  module: {
    rules: [tsRule],
  },
  plugins: [new HtmlWebpackPlugin()],
};
