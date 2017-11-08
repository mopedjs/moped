import Base from './Base';
import env from './env';

const config = {
  presets: [
    // Latest stable ECMAScript features
    [
      require.resolve('babel-preset-env'),
      {
        targets: {
          browsers: ['last 1 version', '> 2%'],
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
