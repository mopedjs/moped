# rule-css

This module provides a sensible rule for handling css in webpack applications. It is part of the moped suite of utilities for creating composable configs for building node.js and react apps.

In development, css is included inline in the JavaScript bundle. In production, the css is extracted into a separate file.  For this reason, the return value consists of a `rule` and a `plugin`.

## Installation

```
yarn add --dev @moped/rule-css
```

## Usage

```js
const createCssRule = require('@moped/rule-css');

const css = createCssRule({
  environment: process.env.NODE_ENV,
  cssFileName: 'index.css',
  shouldUseRelativeAssetPaths: false,
  disableSourceMaps: false,
});

module.exports = {
  entry: __dirname + '/src/index.js',
  output: {
    path: __dirname + '/build',
    filename: 'index.js',
    publicPath: '/',
  },
  module: {
    rules: [css.rule],
  },
  plugins: [css.plugin].filter(plugin => plugin !== null),
};
```

### Options

#### Options.environment

This can be `'development'`, `'production'` or `'test'`. If you don't provide it, it will default to the value of NODE_ENV.  If neither are specified, an exception will be thrown. It will also throw an exception if any value other than `'development'`, `'production'` and `'test'` is used.

#### Options.platform

This can be `'server'` or `'client'`. If you don't provide it, it will default to `'client'`.  Set this to `'server'` to build a server side version of your app that just excludes the css files.  If you are using `:local(.classNames)`, these should still work, providing your webpack config is otherwise the same between client and server.

#### Options.cssFileName

This is the name of the generated css file, relative to the build folder. It defaults to `'static/css/[name].[contenthash:8].css'`. The `[name]` and `[contenthash:8]` tokens will be replaced with appropriate values.

#### Options.shouldUseRelativeAssetPaths

If you're not yet sure what the public path of your app will be. i.e. you don't know if it will be at `https://example.com/` or `https://example.com/foo/bar`, you can use relative paths to ensure that the app always works.  N.B. this will break if you are using client side routing using push state (e.g. react-router).  You should only enable this if you're sure you need it.

#### Options.disableSourceMaps

If you are building a very large application, generating source maps may become too slow, and might not be worth it. You can use this option to disable source maps. You can alternatively set the `GENERATE_SOURCEMAP` environment variable to `false` (this option is for compatibility with create-react-app).

## Licence

MIT