const StartServerPlugin = require('@moped/start-server');

module.exports = {
  entry: __dirname + '/src/index.js',
  output: {
    path: __dirname + '/build',
    filename: 'server.js',
    publicPath: '/',
  },
  target: 'node',
  node: {
    console: false,
    global: false,
    process: false,
    Buffer: false,
    __filename: true,
    __dirname: true,
    setImmediate: false,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            presets: ['babel-preset-env'],
          },
        },
      },
    ],
  },
  plugins: [new StartServerPlugin({port: 3000})],
};
