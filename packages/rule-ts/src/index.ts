import {readFileSync} from 'fs';
import {resolve} from 'path';
import * as webpack from 'webpack';
import {Environment, getEnvironment} from '@moped/enums';
import loadTsConfig from '@moped/load-ts-config';
import * as typescript from 'typescript';

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
function resolvePreset(path: string | any[], loadedFiles: string[] = []): any {
  if (Array.isArray(path)) {
    return [resolvePreset(path[0], loadedFiles)].concat(path.slice(1));
  }
  if (typeof path !== 'string') {
    return path;
  }
  const resolvedPath = babelCore.resolvePreset(path);
  if (loadedFiles.indexOf(resolvedPath) !== -1) {
    throw new Error('A preset cannot depend on itself. Check: ' + path);
  }
  loadedFiles.push(resolvedPath);
  const opts = require(resolvedPath);

  if (typeof opts !== 'object' || !opts) {
    return null;
  }
  return {
    ...opts,
    plugins: (opts.plugins || []).map(readPlugin),
    presets: (opts.presets || []).map((p: string | any[]) =>
      resolvePreset(p, loadedFiles),
    ),
  };
}

function circular<T>(
  obj: T,
  seen: Map<any, string> = new Map(),
  path: string = '<root>',
) {
  if (obj !== null && typeof obj === 'object') {
    if (seen.has(obj)) {
      throw new Error(
        'Cicular reference detected between ' + seen.get(obj) + ' and ' + path,
      );
    }
    seen.set(obj, path);
  }
  if (Array.isArray(obj)) {
    obj.forEach((o, i) => circular(o, seen, path + '[' + i + ']'));
  } else if (obj !== null && typeof obj === 'object') {
    Object.keys(obj).forEach(key =>
      circular((obj as any)[key], seen, path + '.' + key),
    );
  }
  return obj;
}

export interface TypescriptRuleOptions {
  environment?: Environment;
  disableSourceMaps?: boolean;

  srcDirectory?: string;

  babelPresets?: string[];

  tsConfigFileName?: string;
  tsCompilerOptions?: typescript.CompilerOptions;

  workers?: number;
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
    const key = shasum(
      circular({
        babel: babelPresets ? babelPresets.map(p => resolvePreset(p)) : null,
        // TODO: this doesn't respect the `tsConfigFileName` option
        // To fix this, we need to copy the config loading behaviour of
        // https://github.com/TypeStrong/ts-loader/blob/master/src/config.ts
        tsConfigFile: loadTsConfig(process.cwd()).options,
        tsCompilerOptions,
      }),
    );
    loaders.push({
      loader: require.resolve('cache-loader'),
      options: {
        cacheDirectory: resolve('.cache/typescript'),
        cacheIdentifier: `cache-loader:${require('cache-loader/package.json')
          .version} ${process.env.NODE_ENV} ${key}`,
      },
    });
  }
  if (
    options.workers !== undefined &&
    (typeof options.workers !== 'number' ||
      options.workers !== (options.workers | 0))
  ) {
    throw new Error('If provided, options.workers must be an integer');
  }
  const multiThreadded =
    environment === Environment.Development &&
    options.workers &&
    options.workers > 2;
  if (multiThreadded) {
    const workerOptions = {
      // allow one for forked typescript checker/other stuff
      workers: options.workers,
    };
    loaders.push({
      loader: require.resolve('thread-loader'),
      options: workerOptions,
    });
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
        happyPackMode: multiThreadded,
        transpileOnly: true,
        silent: true,
      },
    });
  } else {
    loaders.push({
      loader: tsLoaderPath,
      options: {
        configFile: tsConfigFileName,
        compilerOptions: tsCompilerOptions,
        silent: true,
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
