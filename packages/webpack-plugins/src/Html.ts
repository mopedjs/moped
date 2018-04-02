import * as webpack from 'webpack';

const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackHarddiskPlugin = require('html-webpack-harddisk-plugin');

export interface Options {
  /**
   * Set this to true to write out index.html to disk even when
   * using webpack-dev-server. This is useful if you are doing
   * server side rendering.
   */
  alwaysWriteToDisk?: boolean;
  /**
   * The name of the output file. Default to index.html
   */
  outputFileName?: string;
  /**
   * The name of the input template
   */
  templateFileName: string;
  /**
   * Remove comments and whitespace. This is recommended in production.
   */
  minify?: boolean;
}
/**
 * Generates an `index.html` file with the <script> injected.
 */
export default class Html implements webpack.Plugin {
  private _HtmlWebpackPlugin: webpack.Plugin;
  private _HtmlWebpackHarddiskPlugin: webpack.Plugin | null = null;
  constructor(options: Options) {
    this._HtmlWebpackPlugin = new HtmlWebpackPlugin({
      alwaysWriteToDisk: options.alwaysWriteToDisk,
      filename: options.outputFileName || 'index.html',
      inject: true,
      template: options.templateFileName,
      minify: options.minify
        ? {
            removeComments: true,
            collapseWhitespace: true,
            removeRedundantAttributes: true,
            useShortDoctype: true,
            removeEmptyAttributes: true,
            removeStyleLinkTypeAttributes: true,
            keepClosingSlash: true,
            minifyJS: true,
            minifyCSS: true,
            minifyURLs: true,
          }
        : false,
    });
    if (options.alwaysWriteToDisk) {
      this._HtmlWebpackHarddiskPlugin = new HtmlWebpackHarddiskPlugin();
    }
  }
  apply(compiler: webpack.Compiler) {
    this._HtmlWebpackPlugin.apply(compiler);
    if (this._HtmlWebpackHarddiskPlugin) {
      this._HtmlWebpackHarddiskPlugin.apply(compiler);
    }
  }
}
