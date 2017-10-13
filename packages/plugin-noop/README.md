# plugin-noop

This module provides an empty webpack plugin that doesn't do anything. It is part of the moped suite of utilities for creating composable configs for building node.js and react apps.

This is useful if you need to enable/disable a plugin for different environments. We return this instead of ExtractTextPlugin in `@moped/rule-css` in development.

## Installation

```
yarn add --dev @moped/plugin-noop
```

## Usage

```js
const NoOpPlugin = require('@moped/plugin-noop');

module.exports = {
  entry: __dirname + '/src/index.js',
  output: {
    path: __dirname + '/build',
    filename: 'index.js',
    publicPath: '/',
  },
  plugins: [
    process.env.NODE_ENV === 'development'
      ? new NoOpPlugin()
      : new SomeOtherPlugin(),
  ],
};
```

## Licence

MIT