const StartServerPlugin = require('@moped/start-server');

module.exports = {
  entry: [StartServerPlugin.hotEntry, __dirname + '/src/index.js'],
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
    rules: [],
  },
  plugins: [new StartServerPlugin()],
};
