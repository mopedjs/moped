# start-server

This module provides an easy way to run a webpack bundle in node.js with hot reloading. It is part of the moped suite of utilities for creating composable configs for building node.js and react apps.

This module uses a custom hot reloader to do hot-reloading of individual modules if you use `module.accept`, and fall back to restarting the entire server if there are syntax errors or runtime errors or a module was not handled by `module.accept`.

## Installation

```
yarn add --dev @moped/start-server
```

## Usage

There are two ways to use start-server.  One for HTTP servers, which renders errror pages when in the error states, and queues incoming requests during the build process.  The other for any kind of node.js app.

> **N.B.** This plugin includes the `webpack.HotModuleReplacementPlugin` plugin, so if you have that plugin already in your config, you **must** remove it.

### HTTP Servers

#### webpack.config.js

```js
const StartServerPlugin = require('@moped/start-server');

module.exports = {
  entry: __dirname + '/src/index.js',
  output: {
    path: __dirname + '/build',
    filename: 'server.js',
  },
  plugins: [
    new StartServerPlugin({env: {PORT: 3000}}),
  ]
};
```

#### index.js

This file just handles hot reloading and actually listening on a port. This lets webpack replace individual modules for most reloads, rather than rebooting the entire node process.

```js
if (process.env.NODE_ENV === 'production') {
  require('./server').listen(process.env.PORT);
} else {
  const setServer = require('@moped/start-server/dev-server');
  setServer(require('./server'));

  module.hot.accept('./server', () => {
    setServer(require('./server'));
  });
}
```

#### server.js

This is your actual server.  Can be an express server, or anything that exports a function that takes `req` and `res` as the two arguents.

```js
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World');
});

module.exports = app;
```

### Custom Node Apps

This setup automatically shuts down the node process for any compiler errors or uncaught runtime errors, restarting it on the first successful build.  It will do hot module replacement wherever possible, and fall back to restarting the entire node process if hot module replacement fails.

```js
const StartServerPlugin = require('@moped/start-server');

module.exports = {
  entry: [
    // this additional entry restarts the node process for updates
    StartServerPlugin.hotEntry,
    __dirname + '/src/index.js'
  ],
  output: {
    path: __dirname + '/build',
    filename: 'server.js',
  },
  plugins: [
    new StartServerPlugin(/* {...options} */),
  ]
};
```

## Licence

MIT