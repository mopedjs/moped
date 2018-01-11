"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
// This is similar to how `env` works in Babel:
// https://babeljs.io/docs/usage/babelrc/#env-option
// We are not using `env` because it’s ignored in versions > babel-core@6.10.4:
// https://github.com/babel/babel/issues/4539
// https://github.com/facebookincubator/create-react-app/issues/720
// It’s also nice that we can enforce `NODE_ENV` being specified.
const env = process.env.BABEL_ENV || process.env.NODE_ENV;
if (env !== 'development' && env !== 'test' && env !== 'production') {
    throw new Error('Using `@moped/babel-preset` requires that you specify `NODE_ENV` or ' + '`BABEL_ENV` environment variables. Valid values are "development", ' + '"test", and "production". Instead, received: ' + JSON.stringify(env) + '.');
}
exports.default = env;
//# sourceMappingURL=env.js.map