# loader-perf-log

This file loggs the time taken by loaders for each file. It is part of the moped suite of utilities for creating composable configs for building node.js and react apps.

Loaders can be where a lot of the build time is taken in webpack.  Logging this duration helps you tell what the best things to optimise are

## Installation

```
yarn add --dev @moped/loader-perf-log
```

## Usage

```js
module.exports = {
  entry: __dirname + '/src/index.js',
  output: {
    path: __dirname + '/build',
    filename: 'static/js/[name].[chunkhash:8].js',
    publicPath: '/',
  },
  resolve: {
    extensions: ['.js', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: __dirname + '/src',
        use: [
          {
            loader: '@moped/loader-perf-log',
            options: 'babel',
          },
          {
            loader: 'babel-loader',
          },
        ],
      },
    ],
  },
};

```

## Licence

MIT