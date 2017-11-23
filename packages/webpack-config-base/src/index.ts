import {relative, delimiter} from 'path';
import * as webpack from 'webpack';
import buildExternals, {ExternalMode, ExternalsElement} from './externals';

const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');

export {ExternalMode, ExternalsElement};

export interface Options {
  /**
   * You can use aliases to replace modules with alternative implementations
   */
  alias?: {[key: string]: string};
  /**
   * The absolute path to node_modules
   */
  appNodeModulesDirectory: string;
  /**
   * The directory that your source code lives in
   */
  appSourceDirectory: string;
  /**
   * Report the first error as a hard error instead of tolerating it.
   */
  bail?: boolean;
  /**
   * The directory to output to
   */
  buildDirectory: string;
  /**
   * Choose a style of source mapping to enhance the debugging process.
   * These values can affect build and rebuild speed dramatically.
   *
   * cheap-module-source-map is a good option for development
   * source-map is a good option for production
   */
  devtool?: DevTool | false;
  /**
   * The file or filenames to use as the entry point to the resulting
   * bundle.
   */
  entry: string | string[];
  /**
   * File extensions for resolving files.
   * ['.web.js', '.js', '.json', '.web.jsx', '.jsx'] are automatically
   * added after any custom ones you add
   */
  extensions?: string[];
  externals?: ExternalsElement | ExternalsElement[];
  /**
   * Add additional plugins to the compiler.
   */
  plugins?: (webpack.Plugin | null | void)[];
  /**
   * Webpack uses `publicPath` to determine where the app is being served from.
   *
   * It defaults to `/`.
   */
  publicPath?: string;
  /**
   * An array of rules applied for modules.
   */
  rules?: webpack.Rule[];
  /**
   * Target of compilation. Passed from configuration options.
   * Example values: "web", "node"
   */
  target?: Target;

  /**
   * The file name for the main JavaScript entry point.
   *
   * Defaults to `server.js` if the target is node and
   * `static/js/[name].[chunkhash:8].js` if the target
   * is web.
   */
  outputFileName?: string;

  /**
   * The file name for JavaScript chunks generated when
   * code splitting is enabled
   *
   * Defaults to `[name].chunk.js` if the target is node
   * and `static/js/[name].[chunkhash:8].chunk.js` if the
   * target is web.
   */
  outputChunkFileName?: string;
}

export enum DevTool {
  'eval' = 'eval',
  'inlineSourceMap' = 'inline-source-map',
  'cheapEvalSourceMap' = 'cheap-eval-source-map',
  'cheapSourceMap' = 'cheap-source-map',
  'cheapModuleEvalSourceMap' = 'cheap-module-eval-source-map',
  'cheapModuleSourceMap' = 'cheap-module-source-map',
  'evalSourceMap' = 'eval-source-map',
  'sourceMap' = 'source-map',
  'nosourcesSourceMap' = 'nosources-source-map',
  'hiddenSourceMap' = 'hidden-source-map',
}
export enum Target {
  web = 'web',
  webworker = 'webworker',
  node = 'node',
}

export function getResolveConfig(
  options: Pick<
    Options,
    'alias' | 'appNodeModulesDirectory' | 'appSourceDirectory' | 'extensions'
  >,
) {
  return {
    // This allows you to set a fallback for where Webpack should look for modules.
    // We placed these paths second because we want `node_modules` to "win"
    // if there are any conflicts. This matches Node resolution mechanism.
    // https://github.com/facebookincubator/create-react-app/issues/253
    modules: ['node_modules', options.appNodeModulesDirectory].concat(
      // It is guaranteed to exist because we tweak it in `env.js`
      (process.env.NODE_PATH || '').split(delimiter).filter(Boolean),
    ),
    // These are the reasonable defaults supported by the Node ecosystem.
    // We also include JSX as a common component filename extension to support
    // some tools, although we do not recommend using it, see:
    // https://github.com/facebookincubator/create-react-app/issues/290
    // `web` extension prefixes have been added for better support
    // for React Native Web.
    extensions: (options.extensions || [])
      .concat(['.web.js', '.js', '.json', '.web.jsx', '.jsx'])
      .filter((ext, i, arr) => arr.indexOf(ext) === i),
    alias: {
      // Support React Native Web
      // https://www.smashingmagazine.com/2016/08/a-glimpse-into-the-future-with-react-native-for-web/
      'react-native': 'react-native-web',
      ...(options.alias || {}),
    },
    plugins: [
      // Prevents users from importing files from outside of src/ (or node_modules/).
      // This often causes confusion because we only process files within src/ with babel.
      // To fix this, we prevent you from importing files out of src/ -- if you'd like to,
      // please link the files into your node_modules/ and let module-resolution kick in.
      // Make sure your source files are compiled, as they will not be processed in any way.
      new ModuleScopePlugin(options.appSourceDirectory),
    ],
  };
}

export default function webpackConfig(options: Options): webpack.Configuration {
  const publicPath = options.publicPath || '/';
  return {
    bail: options.bail || false,
    devtool:
      options.devtool !== undefined
        ? options.devtool
        : process.env.NODE_ENV === 'production'
          ? DevTool.sourceMap
          : DevTool.cheapModuleSourceMap,
    entry: options.entry,
    output: {
      // The build folder.
      path: options.buildDirectory,
      // Add /* filename */ comments to generated require()s in the output.
      pathinfo: process.env.NODE_ENV !== 'production',
      // Generated JS file names (with nested folders).
      // There will be one main bundle, and one file per asynchronous chunk.
      // We don't currently advertise code splitting but Webpack supports it.
      filename:
        options.outputFileName ||
        (options.target === Target.node
          ? 'server.js'
          : process.env.NODE_ENV === 'production'
            ? 'static/js/[name].[chunkhash:8].js'
            : 'static/js/bundle.js'),
      chunkFilename:
        options.outputChunkFileName ||
        (options.target === Target.node
          ? '[name].chunk.js'
          : process.env.NODE_ENV === 'production'
            ? 'static/js/[name].[chunkhash:8].chunk.js'
            : 'static/js/[name].chunk.js'),
      // We inferred the "public path" (such as / or /my-project) from homepage.
      publicPath,
      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: info =>
        relative(options.appSourceDirectory, info.absoluteResourcePath).replace(
          /\\/g,
          '/',
        ),
    },
    resolve: getResolveConfig(options),
    module: {
      strictExportPresence: true,
      rules: options.rules || [],
    },
    plugins: (options.plugins || []).filter(
      (p: webpack.Plugin | null | void): p is webpack.Plugin => p != null,
    ),
    externals: options.externals
      ? buildExternals(options.externals)
      : undefined,
    target: options.target || 'web',
    // Some libraries import Node modules but don't use them in the browser.
    // Tell Webpack to provide empty mocks for them so importing them works.
    node:
      options.target !== Target.node
        ? {
            dgram: 'empty',
            fs: 'empty',
            net: 'empty',
            tls: 'empty',
          }
        : {
            console: false,
            global: false,
            process: false,
            Buffer: false,
            __filename: true,
            __dirname: true,
            setImmediate: false,
          },
    // Turn off performance hints during development because we don't do any
    // splitting or minification in interest of speed. These warnings become
    // cumbersome.
    performance: {
      hints: process.env.NODE_ENV === 'production' ? undefined : false,
    },
  };
}

module.exports = webpackConfig;
module.exports.default = webpackConfig;

module.exports.ExternalMode = ExternalMode;
module.exports.DevTool = DevTool;
module.exports.Target = Target;
module.exports.getResolveConfig = getResolveConfig;
