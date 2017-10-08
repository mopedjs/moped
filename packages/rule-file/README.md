# rule-css

This module provides a sensible rule for handling arbitrary files in webpack apps. It is part of the moped suite of utilities for creating composable configs for building node.js and react apps.

When you import a file using this package, you get the url of that file.

## Installation

```
yarn add --dev @moped/rule-file
```

## Usage

```js
const createFileRule = require('@moped/rule-file');

module.exports = {
  entry: __dirname + '/src/index.js',
  output: {
    path: __dirname + '/build',
    filename: 'index.js',
    publicPath: '/',
  },
  module: {
    rules: [createFileRule()],
  },
};
```

## Licence

MIT