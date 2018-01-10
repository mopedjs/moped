"use strict";
// @public

Object.defineProperty(exports, "__esModule", { value: true });
const Base_1 = require("./Base");
const config = {
    presets: [
    // ES features necessary for user's Node version
    [require.resolve('babel-preset-env'), {
        targets: {
            node: 'current'
        }
    }],
    // JSX, Flow
    require.resolve('babel-preset-react')],
    plugins: Base_1.default.concat([
    // Compiles import() to a deferred require()
    require.resolve('babel-plugin-dynamic-import-node')])
};
exports.default = config;
module.exports = config;
Object.defineProperty(module.exports, 'default', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: config
});
//# sourceMappingURL=server.js.map