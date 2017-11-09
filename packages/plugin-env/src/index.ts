import * as webpack from 'webpack';
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin');

export interface ProcessEnv {
  [key: string]: string | undefined;
}

export default class EnvPlugin {
  private _plugins: webpack.Plugin[];
  constructor(env: ProcessEnv = process.env) {
    // Stringify all values so we can feed into Webpack DefinePlugin
    const stringified = Object.keys(env).reduce(
      (stringifiedEnv, key) => {
        stringifiedEnv['process.env.' + key] = JSON.stringify(env[key]);
        return stringifiedEnv;
      },
      <ProcessEnv>{},
    );
    this._plugins = [
      new InterpolateHtmlPlugin(env),
      // Makes some environment variables available to the JS code, for example:
      // if (process.env.NODE_ENV === 'development') { ... }. See `./env.js`.
      new webpack.DefinePlugin(stringified),
    ];
  }
  apply(compiler: webpack.Compiler): void {
    this._plugins.forEach(plugin => {
      plugin.apply(compiler);
    });
  }
}

module.exports = EnvPlugin;
module.exports.default = EnvPlugin;
