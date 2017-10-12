# rule-ts

This module provides a sensible rule for handling typescript in webpack applications. It is part of the moped suite of utilities for creating composable configs for building node.js and react apps.

In development, the result of transforming typescript files are cached in `.cache/typescript` and the transformation is parallelised across multiple threads. This also means that it **does not type check** in development.  In production, it takes the slower approach of compiling every file individually. This is necessary to alow `const enum`s to be stripped from the output.

## Installation

```
yarn add --dev @moped/rule-ts
```

## Usage

```js
const createTsRule = require('@moped/rule-ts');

module.exports = {
  entry: __dirname + '/src/index.ts',
  output: {
    path: __dirname + '/build',
    filename: 'static/js/[name].[chunkhash:8].js',
    publicPath: '/',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
  },
  module: {
    rules: [createTsRule()],
  },
};

```

### Usage with `rule-file` and `rule-css`

To use with other loaders, you have two options.  You can use `require` instead of ES imports, this will effectively just give you an `any`. Alternatively, you can add a declaration for the type of module you want to import.  e.g.

```
declare module '*.png' {
  export= string;
}
```

The wildcard allows this to match all `.png` files.

### Options

#### Options.environment

This can be `'development'`, `'production'` or `'test'`. If you don't provide it, it will default to the value of NODE_ENV.  If neither are specified, an exception will be thrown. It will also throw an exception if any value other than `'development'`, `'production'` and `'test'` is used.

#### Options.srcDirectory

This is the directory that your source code lives in, it should **not** include your `node_modules` folder.  It will default to `src`.  Files outside of this folder are not transformed.

#### Options.babelPresets

An array of file names for babel presets.  If you add this option, babel will be used to transform the code after it has been transformed by typescript.  If you do not add this option, the code is only transformed by typescript. The babel transform will never use babelrc files.

#### Options.tsConfigFileName

The filename for your tsconfig file.

#### Options.tsCompilerOptions

Overrides for the `compilerOptions` section of your tsconfig. `@moped/rule-ts` automatically enables `preserveConstEnums` in development.

#### Options.disableSourceMaps

If you are building a very large application, generating source maps may become too slow, and might not be worth it. You can use this option to disable source maps. You can alternatively set the `GENERATE_SOURCEMAP` environment variable to `false` (this option is for compatibility with create-react-app).

## Licence

MIT