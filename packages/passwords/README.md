# passwords

This module provides safe and secure password management for web applications. It is part of the moped suite of utilities for creating composable configs for building node.js and react apps.

This module uses [secure-password](https://www.npmjs.com/package/secure-password) to provide secure salting and hashing of passwords.  In addition to that, it provides built in rate limiting and type safety.

## Installation

```
yarn add @moped/passwords
```

## Usage

There are two ways of using the main password store.  You can have an internal store that generates and id for each password automatically, or one that accepts a password (e.g. a user id or user name).  The id must always be a `string` or `number`.

Basic Usage:

```js
const createPasswordStore = require('@moped/passwords');

module.exports = createPasswordStore(store, options);
```

Options:

option name | environment variable | type | default | description
------------|----------------------|------|---------|---------------
`opsLimit` | `process.env.PASSWORD_OPS_LIMIT` | `number` | `30` | The operations limit value passed to secure-password
`memLimit` | `process.env.PASSWORD_MEM_LIMIT` | bytes | `80MB` | The memory limit value passed to secure-password. This can either be a `number` of bytes or a `string` like `100MB`
`bucketSize` | `process.env.PASSWORD_BUCKET_SIZE` | `number` | `10` | The number of password attempts before rate limiting starts
`fillRate` | `process.env.PASSWORD_FILL_RATE` | milliseconds | `10 seconds` | The minimum time between password attempts once the bucket has emptied. This can either be a `number` of milliseconds or a `string` like `20 seconds`.

_Each option can be passed directly, or set via an enrivonment variable._

### `opsLimit` and `memLimit`

The `opsLimit` and `memLimit` control how much CPU time and how much memory is required to crack a password.  Higher values will be more secure, but will also put more load on your server when users are signing in.  This library will start printing warnings if these values seem to be too low, and will eventually crash in production if the values get much too low, to prevent unauthorised access.

### `bucketSize` and `fillRate`

The `bucketSize` and `fillRate` control the rate limiting.  You can think of this as matching the following metaphor:

For each password stored in the sytem, there is a bucket full of coins. `bucketSize` controlls how many coins fit in the bucket.  Each time you attempt to verify a password, you must remove a token from the bucket (whether the password turns out to be right or not).  If there is no token, you must wait for one to be added to the bucket.  Every `fillRate`ms, a new token is added to the bucket, until the bucket becomes full.

Another way of looking at it, is that you can make `bucketSize` password attempts in rapid succession before rate limiting starts, after that, you can then only make one password attempt every `fillRate`ms.

The data needed for rate limiting is stored along with the password hash, so rate limiting survives server crashes/restarts.

**N.B.** if you have multiple servers, you either need to ensure that each password can only be attempted on one server at a time, or you need to ensure that the whole verify operation takes place in a single database transaction (in a database with strong transactional consistency), otherwise an attacker could exceed the rate limmit.  You do not need to worry about this if you only have a single server.

### PasswordData

The data you will be given to store/retrieve for each password is an object of the form:

```typescript
interface PasswordData {
  numberOfPasswordAttempts: number;
  timeStampOfLastReset: number;
  hash: string;
}
```

`numberOfPasswordAttempts` and `timeStampOfLastReset` give us the current state of that password's rate limiting bucket and the `hash` is a securely salted and hashed copy of the password.

### User Specified ID

Define a store:

```js
// passwords.js

const createPasswordStore = require('@moped/passwords');
const passwordData = new Map();

module.exports = createPasswordStore({
  read(id) {
    return Promise.resolve(passwordData.get(id));
  }
  set(id, data) {
    passwordData.set(id, data);
    return Promise.resolve(null);
  }
});
```

Set a password:

```js
const passwords = require('./passwords');

passwords.write('username', 'my password').then(() => {
  console.log('password written');
}, err => {
  console.log('failed ', err);
});
```

Verify a password:

```js
const passwords = require('./passwords');

passwords.verify('username', 'my password').then(isCorrect => {
  if (isCorrect === true) {
    console.log('access granted');
  } else {
    console.log('incorrect password, try again');
  }
}, err => {
  console.log('failed ', err);
});
```

### Augo Generated ID

Define a store:

```js
// passwords.js

const createPasswordStore = require('@moped/passwords');
const passwordData = new Map();
let nextID = 0;

module.exports = createPasswordStore({
  read(id) {
    return Promise.resolve(passwordData.get(id));
  }
  create(data) {
    const id = nextID++;
    passwordData.set(id, data);
    return Promise.resolve(id);
  }
  update(id, data) {
    passwordData.set(id, data);
    return Promise.resolve(null);
  }
});
```

Set a password:

```js
const passwords = require('./passwords');

passwords.write('username', 'my password').then(id => {
  console.log('password written with id ', id);
}, err => {
  console.log('failed ', err);
});
```

Verify a password:

```js
const passwords = require('./passwords');

passwords.verify(id, 'my password').then(isCorrect => {
  if (isCorrect === true) {
    console.log('access granted');
  } else {
    console.log('incorrect password, try again');
  }
}, err => {
  console.log('failed ', err);
});
```

### Generating a Password

The `generatePassword(length, encoding)` utility lets you auto-generate secure passwords.  These are useful for sending in password reset e-mails or using in passwordless login environments.  You can select an encoding from 4 values.

 * decimal encoding is the least secure, but is useful if you want your users to enter a pass code on a numeric keypad.  Only use this for relatively short lived passwords.
 * hex is marginally better than decimal, but probably not the right choice.
 * base32 is a good compromise of using characters that are easy to distinguish from each other in most fonts, and easy to type, but encoding a relatively secure password for the length.
 * base64 gives the best security for the length of password, but it can be error prone if typed by hand.

Longer paswords are always more secure.  For short lived (less than a few hours) passwords, I recommend a minimum length of 6 characters, for longer lived passwords, I recommend a minimum length of 20 characters.  Caveats:

 1. I'm not an expert, you should consult with a security expert to determine the best values for your application.
 2. I'm writing this in 2017, expect these numbers to need to grow steadily over time.

```js
const {generatePassword, Encoding} = require('@moped/passwords');

generatePassword(10, Encoding.decimal).then(result => {
  // e.g. 0123456789
  console.log(result)
});

generatePassword(10, Encoding.hex).then(result => {
  // e.g. f1a3f5e789
  console.log(result)
});

generatePassword(10, Encoding.base32).then(result => {
  // e.g. 6xa3fvek89
  console.log(result)
});

generatePassword(10, Encoding.base32).then(result => {
  // e.g. SxaBfvGk89
  console.log(result)
});
```

## Security

If you find potential security issues in this library, please e-mail forbes@lindesay.co.uk or report it to the node security project via https://nodesecurity.io/report

## Licence

MIT