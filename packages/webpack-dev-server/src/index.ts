import webpack = require('webpack');
import WebpackDevServer = require('webpack-dev-server');
import createWebpackDevServerConfig, {WebpackDevServerConfig} from './config';

export type Compiler = webpack.Compiler;
export type MultiCompiler = webpack.MultiCompiler;
export type WebpackDevServer = WebpackDevServer;
export {WebpackDevServerConfig};
export default function createWebpackDevServer(
  compiler: Compiler | MultiCompiler,
  options: WebpackDevServerConfig,
): WebpackDevServer {
  return new WebpackDevServer(compiler, createWebpackDevServerConfig(
    options,
  ) as any);
}

module.exports = createWebpackDevServer;
module.exports.default = createWebpackDevServer;
