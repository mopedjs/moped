// @public

import Base from './Base';

const config = {
  presets: [
    // ES features necessary for user's Node version
    [
      require.resolve('babel-preset-env'),
      {
        targets: {
          node: 'current',
        },
        // Do not transform modules to CJS
        modules: false,
      },
    ],
    // JSX, Flow
    require.resolve('babel-preset-react'),
  ],
  plugins: Base.concat([
    // Compiles import() to a deferred require()
    require.resolve('babel-plugin-dynamic-import-node'),
  ]),
};
export default config;

module.exports = config;
Object.defineProperty(module.exports, 'default', {
  configurable: false,
  enumerable: false,
  writable: false,
  value: config,
});
