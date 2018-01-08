import * as webpack from 'webpack';
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin');

export interface ProcessEnv {
  [key: string]: string | undefined;
}
export interface Options {
  voidOtherEnvironmentVariables?: boolean;
}

export default class EnvPlugin {
  private _plugins: webpack.Plugin[];
  constructor(env: ProcessEnv = process.env, options: Options = {}) {
    // Stringify all values so we can feed into Webpack DefinePlugin
    const stringified = Object.keys(env).reduce(
      (stringifiedEnv, key) => {
        stringifiedEnv['process.env.' + key] =
          JSON.stringify(env[key]) || 'undefined';
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
    if (options.voidOtherEnvironmentVariables) {
      this._plugins.push(
        new webpack.DefinePlugin({
          'process.env': '{}',
        }),
      );
    }
  }
  apply(compiler: webpack.Compiler): void {
    this._plugins.forEach(plugin => {
      plugin.apply(compiler);
    });
  }
}

module.exports = EnvPlugin;
module.exports.default = EnvPlugin;
