# node-builtins

An array of the core node.js modules. It is part of the moped suite of utilities for creating composable configs for building node.js and react apps.

This module is useful for building node.js apps using webpack.

## Installation

```
yarn add @moped/node-builtins
```

## Usage

```js
import builtins from '@moped/node-builtins';

function isBuiltin(name) {
  return builtins.indexOf(name) !== -1;
}
```

## License

MIT