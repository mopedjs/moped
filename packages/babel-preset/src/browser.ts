// @public

import Base from './Base';
import env from './env';

const config = {
  presets: [
    // Latest stable ECMAScript features
    [
      require.resolve('babel-preset-env'),
      {
        targets: {
          // React parses on ie 9, so we should too
          ie: 9,
          // We currently minify with uglify
          // Remove after https://github.com/mishoo/UglifyJS2/issues/448
          uglify: true,
        },
        // Disable polyfill transforms
        useBuiltIns: false,
        // Do not transform modules to CJS
        modules: false,
      },
    ],
    // JSX, Flow
    require.resolve('babel-preset-react'),
  ],
  plugins: Base.concat([
    // function* () { yield 42; yield 43; }
    [
      require.resolve('babel-plugin-transform-regenerator'),
      {
        // Async functions are converted to generators by babel-preset-env
        async: false,
      },
    ],
    // Adds syntax support for import()
    require.resolve('babel-plugin-syntax-dynamic-import'),
  ]),
};

if (env === 'production') {
  // Optimization: hoist JSX that never changes out of render()
  // Disabled because of issues: https://github.com/facebookincubator/create-react-app/issues/553
  // TODO: Enable again when these issues are resolved.
  // plugins.push.apply(plugins, [
  //   require.resolve('babel-plugin-transform-react-constant-elements')
  // ]);
}
export default config;

module.exports = config;
Object.defineProperty(module.exports, 'default', {
  configurable: false,
  enumerable: false,
  writable: false,
  value: config,
});
