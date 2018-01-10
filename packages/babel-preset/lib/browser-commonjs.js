"use strict";
// @public

Object.defineProperty(exports, "__esModule", { value: true });
const Base_1 = require("./Base");
const env_1 = require("./env");
const config = {
    presets: [
    // Latest stable ECMAScript features
    [require.resolve('babel-preset-env'), {
        targets: {
            // React parses on ie 9, so we should too
            ie: 9,
            // We currently minify with uglify
            // Remove after https://github.com/mishoo/UglifyJS2/issues/448
            uglify: true
        },
        // Disable polyfill transforms
        useBuiltIns: false,
        // Do transform modules to CJS
        modules: 'commonjs'
    }],
    // JSX, Flow
    require.resolve('babel-preset-react')],
    plugins: Base_1.default.concat([
    // function* () { yield 42; yield 43; }
    [require.resolve('babel-plugin-transform-regenerator'), {
        // Async functions are converted to generators by babel-preset-env
        async: false
    }],
    // Adds syntax support for import()
    require.resolve('babel-plugin-syntax-dynamic-import')])
};
if (env_1.default === 'production') {
    // Optimization: hoist JSX that never changes out of render()
    // Disabled because of issues: https://github.com/facebookincubator/create-react-app/issues/553
    // TODO: Enable again when these issues are resolved.
    // plugins.push.apply(plugins, [
    //   require.resolve('babel-plugin-transform-react-constant-elements')
    // ]);
}
exports.default = config;
module.exports = config;
Object.defineProperty(module.exports, 'default', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: config
});
//# sourceMappingURL=browser-commonjs.js.map