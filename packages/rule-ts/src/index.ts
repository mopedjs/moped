import {readFileSync} from 'fs';
import {resolve} from 'path';
import * as webpack from 'webpack';
import {Environment, getEnvironment} from '@moped/enums';
import loadTsConfig from '@moped/load-ts-config';
import * as typescript from 'typescript';
// import {loadSync} from 'tsconfig';

const babelLoaderPath = require.resolve('babel-loader');
const tsLoaderPath = require.resolve('ts-loader');

const babelCore = require('babel-core');
const shasum = require('shasum');

function readPlugin(path: string | any[] | Function): any {
  if (Array.isArray(path)) {
    return [readPlugin(path[0])].concat(path.slice(1));
  }
  if (typeof path === 'function') {
    return '[Function]';
  }
  return readFileSync(babelCore.resolvePlugin(path), 'utf8');
}
function resolvePreset(path: string | any[]): any {
  if (Array.isArray(path)) {
    return [resolvePreset(path[0])].concat(path.slice(1));
  }
  if (typeof path !== 'string') {
    return path;
  }
  const opts = require(babelCore.resolvePreset(path));

  if (typeof opts !== 'object' || !opts) {
    return null;
  }
  return {
    ...opts,
    plugins: (opts.plugins || []).map(readPlugin),
    presets: (opts.presets || []).map(resolvePreset),
  };
}

export interface TypescriptRuleOptions {
  environment?: Environment;
  disableSourceMaps?: boolean;

  srcDirectory?: string;

  babelPresets?: string[];

  tsConfigFileName?: string;
  tsCompilerOptions?: typescript.CompilerOptions;
}

export default function createTypescriptRule(
  options: TypescriptRuleOptions = {},
) {
  const environment = getEnvironment(options.environment);

  if (
    options.srcDirectory !== undefined &&
    typeof options.srcDirectory !== 'string'
  ) {
    throw new Error('If provided, options.srcDirectory must be a string.');
  }
  const srcDirectory = resolve(options.srcDirectory || 'src');

  if (
    options.babelPresets !== undefined &&
    !(
      Array.isArray(options.babelPresets) &&
      options.babelPresets.every(preset => typeof preset === 'string')
    )
  ) {
    throw new Error(
      'If provided, options.babelPresets must be an array of file names.',
    );
  }
  const babelPresets = options.babelPresets;
  const babelOptions = babelPresets
    ? {
        babelrc: false,
        presets: babelPresets,
        // // We use cache-loader instead of babel's cache directory
        compact: environment !== Environment.Development,
      }
    : null;
  if (
    options.disableSourceMaps !== undefined &&
    typeof options.disableSourceMaps !== 'boolean'
  ) {
    throw new Error('options.disableSourceMaps must be a boolean, if provided');
  }
  const shouldUseSourceMap =
    typeof options.disableSourceMaps !== 'boolean'
      ? !options.disableSourceMaps
      : process.env.GENERATE_SOURCEMAP !== 'false';

  if (
    options.tsConfigFileName !== undefined &&
    typeof options.tsConfigFileName !== 'string'
  ) {
    throw new Error('If provided, options.tsConfigFileName must be a string.');
  }
  const tsConfigFileName = options.tsConfigFileName || 'tsconfig.json';
  if (
    options.tsCompilerOptions !== undefined &&
    (options.tsCompilerOptions === null ||
      typeof options.tsCompilerOptions !== 'object' ||
      Array.isArray(options.tsCompilerOptions))
  ) {
    throw new Error(
      'If provided, options.tsCompilerOptions must be an object.',
    );
  }
  const tsCompilerOptions = {...(options.tsCompilerOptions || {})};
  tsCompilerOptions.declaration = false;
  tsCompilerOptions.sourceMap = shouldUseSourceMap;

  const loaders: webpack.Loader[] = [];
  if (environment === Environment.Development) {
    const key = shasum({
      babel: babelPresets ? babelPresets.map(resolvePreset) : null,
      // TODO: this doesn't respect the `tsConfigFileName` option
      // To fix this, we need to copy the config loading behaviour of
      // https://github.com/TypeStrong/ts-loader/blob/master/src/config.ts
      tsConfigFile: loadTsConfig(process.cwd()).options,
      tsCompilerOptions,
    });
    loaders.push({
      loader: require.resolve('cache-loader'),
      options: {
        cacheDirectory: resolve('.cache/typescript'),
        cacheIdentifier: `cache-loader:${require('cache-loader/package.json')
          .version} ${process.env.NODE_ENV} ${key}`,
      },
    });
  }
  if (environment === Environment.Development) {
    const workerOptions = {
      // allow one for forked typescript checker/other stuff
      workers: require('os').cpus().length - 1,
    };
    if (workerOptions.workers > 1) {
      loaders.push({
        loader: require.resolve('thread-loader'),
        options: workerOptions,
      });
    }
  }
  if (babelOptions) {
    loaders.push({
      loader: babelLoaderPath,
      options: babelOptions,
    });
  }
  if (environment === Environment.Development) {
    tsCompilerOptions.preserveConstEnums = true;
    loaders.push({
      loader: tsLoaderPath,
      options: {
        configFile: tsConfigFileName,
        compilerOptions: tsCompilerOptions,
        // happy pack mode is actually also thread-loader mode
        happyPackMode: true,
        silent: true,
      },
    });
  } else {
    loaders.push({
      loader: tsLoaderPath,
      options: {
        configFile: tsConfigFileName,
        compilerOptions: tsCompilerOptions,
        happyPackMode: false,
        silent: false,
      },
    });
  }
  return {
    test: /\.tsx?$/,
    include: srcDirectory,
    use: loaders,
  };
}
module.exports = createTypescriptRule;
module.exports.default = createTypescriptRule;
