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
