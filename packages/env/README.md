# env

This module helps normalise your environment variables. It is part of the moped suite of utilities for creating composable configs for building node.js and react apps.

You must load env before all other modules.

## Installation

```
yarn add --dev @moped/env
```

## Usage ES6

If you want your users to specify NODE_ENV manually:

```js
import '@moped/env/auto';
import * as webpack from 'webpack;
```

In your build file:

```js
import '@moped/env/production';
import * as webpack from 'webpack;
```

In your tests:

```js
import '@moped/env/test';
import * as webpack from 'webpack;
```

In development:

```js
import '@moped/env/development';
import * as webpack from 'webpack;
```

## Usage ES5

If you want your users to specify NODE_ENV manually:

```js
require('@moped/env/auto');
const webpack = require('webpack');
```

In your build file:

```js
require('@moped/env/production');
const webpack = require('webpack');
```

In your tests:

```js
require('@moped/env/test');
const webpack = require('webpack');
```

In development:

```js
require('@moped/env/development');
const webpack = require('webpack');
```

## Configuration

Once you are using `@moped/env`, you can configure your environment using `.env` files. You should make sure the following is included in your `.gitignore` file:

```
.env.local
.env.development.local
.env.test.local
.env.production.local
```

When reading an environment variable, `@moped/env` will first look in the actual environment, then `.env.{NODE_ENV}.local`, then `.env.{NODE_ENV}`, then `.env.local` then `.env`. You use `.env` for config shared amongst all environments/for setting up a default config. You can use the `.local` variants for confidential configuration that you don't want published to GitHub, and you can use the `{NODE_ENV}` variants to override config in different environments.

You should always try to ensure your app at least runs with no `.local` config, as this will make it easier to onboard new team members.

## LICENSE

MIT
