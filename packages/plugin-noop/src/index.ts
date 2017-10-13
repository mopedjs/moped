import * as webpack from 'webpack';

export default class NoOpPlugin implements webpack.Plugin {
  apply(compiler: webpack.Compiler) {}
}

module.exports = NoOpPlugin;
module.exports.default = NoOpPlugin;
