"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const browser_1 = require("./browser");
const env_1 = require("./env");
exports.default = env_1.default === 'test' ? server_1.default : browser_1.default;
module.exports = env_1.default === 'test' ? require('./server') : require('./browser');
//# sourceMappingURL=index.js.map