// TODO: add a schema like https://github.com/SchemaStore/schemastore/blob/master/schemas/json/prettierrc.json
import {realpathSync, accessSync} from 'fs';
import {relative, resolve, dirname, basename, join} from 'path';
import chalk from 'chalk';
import cosmiconfig = require('cosmiconfig');
import Ajv = require('ajv');
import {AppConfigDefinition} from './moped-schema';

const F_OK: number = require('fs').F_OK;

const mopedSchema = require('../moped-schema.json');
const ajv = new Ajv({allErrors: true, extendRefs: 'fail'});
const validateAppConfig = ajv.compile({
  ...mopedSchema,
  oneOf: [{$ref: '#/definitions/appConfigDefinition'}],
});
const validateMonoRepoConfig = ajv.compile({
  ...mopedSchema,
  oneOf: [{$ref: '#/definitions/monoRepoDefinition'}],
});

const configLoader = cosmiconfig('moped', {
  sync: true,
  rcExtensions: true,
});

interface RawAppConfig extends AppConfigDefinition {
  monorepo?: false;
}
interface RawMonoRepoConfig {
  monorepo: true;
  [key: string]: RawAppConfig | true;
}
type RawConfig = RawMonoRepoConfig | RawAppConfig;

export interface AppConfig {
  /**
   * Relative path to the entry point for the client.
   */
  clientEntryPoint: string | null;
  /**
   * Relative path to a folder to use for database migrations
   */
  dbMigrations: string | null;
  /**
   * Relative path to a file containing types to override database columns.
   */
  dbOverrides: string | null;
  /**
   * Relative path to a directory to output a typescript database client to.
   */
  dbSchema: string;
  /**
   * The DATABASE_URL for use in development e.g. postgres://app-name@localhost/app-name
   */
  dbURL: string | null;
  /**
   * Relative path to an html file to use as a template.
   */
  htmlTemplate: string | null;
  /**
   * Default port to run the app on in development (N.B. backend will default to port + 1)
   */
  port: number;
  /**
   * Relative path to a public directory, from which all files will be made publicly available.
   */
  publicDirectory: string | null;
  /**
   * Relative path to the entry point for the server in development.
   */
  serverEntryPointDev: string;
  /**
   * Relative path to the entry point for the server in production.
   */
  serverEntryPointProd: string;
}
export interface RootMonoRepoConfig {
  monorepo: true;
  configs: {[key: string]: AppConfig};
}
export interface RootSingleRepoConfig {
  monorepo: false;
  config: AppConfig;
}
export type Config = RootMonoRepoConfig | RootSingleRepoConfig;

export interface Options {
  realpathSync: (path: string) => string;
  accessSync: (path: string, mode?: number) => void;
  logAndExitOnError: boolean;
  shortenPathsForTests: boolean;
}

function parseOptions(options: Partial<Options> | undefined): Options {
  return {
    accessSync: (options && options.accessSync) || accessSync,
    realpathSync: (options && options.realpathSync) || realpathSync,
    logAndExitOnError: (options && options.logAndExitOnError) || false,
    shortenPathsForTests: (options && options.shortenPathsForTests) || false,
  };
}

function withDefaults(
  basedir: string,
  config: RawAppConfig,
  fs: Options,
): AppConfig {
  const srcDirectory = join(basedir, 'src');
  function resolveApp(relativePath: string, options: {required: true}): string;
  function resolveApp(
    relativePath: string,
    options?: {required: boolean},
  ): string | null;
  function resolveApp(
    relativePath: string,
    options: {required: boolean} = {required: false},
  ): string | null {
    const filePath = resolve(srcDirectory, relativePath);
    try {
      fs.accessSync(filePath, F_OK);
      return fs.shortenPathsForTests
        ? relative(basedir, filePath).replace(/\\/g, '/')
        : filePath;
    } catch (err) {
      if (options.required) {
        const dirName = dirname(filePath);
        const fileName = basename(filePath);
        if (!fs.logAndExitOnError) {
          throw new Error(
            'Could not find a required file, "' +
              fileName +
              '", searched in "' +
              (fs.shortenPathsForTests
                ? relative(basedir, dirName).replace(/\\/g, '/')
                : dirName) +
              '"',
          );
        }
        console.log(chalk.red('Could not find a required file.'));
        console.log(chalk.red('  Name: ') + chalk.cyan(fileName));
        console.log(
          chalk.red('  Searched in: ') +
            chalk.cyan(
              fs.shortenPathsForTests
                ? relative(basedir, dirName).replace(/\\/g, '/')
                : dirName,
            ),
        );
        process.exit(1);
      }
      return null;
    }
  }
  function firstExistingInApp(
    paths: string[],
    options: {required: true},
  ): string;
  function firstExistingInApp(
    paths: string[],
    options?: {required: boolean},
  ): string | null;
  function firstExistingInApp(
    paths: string[],
    options: {required: boolean} = {required: false},
  ): string | null {
    for (const path of paths) {
      const p = resolveApp(path);
      if (p != null) {
        return p;
      }
    }
    if (options.required) {
      const dirName = paths.reduce((part, path) => {
        while (part !== path.substr(0, part.length)) {
          part = part.substr(0, part.length - 1);
        }

        return part.substring(0, part.lastIndexOf('/') + 1);
      });
      if (!fs.logAndExitOnError) {
        throw new Error(
          'Could not find a required file, at least one of these file names must exist: ' +
            paths
              .map(path => '"' + path.substr(dirName.length) + '"')
              .join(', ') +
            ' searched in "' +
            (fs.shortenPathsForTests
              ? relative(basedir, dirName).replace(/\\/g, '/')
              : dirName) +
            '"',
        );
      }
      console.log(
        chalk.red(
          'Could not find a required file, at least one of these file names must exist.',
        ),
      );
      paths.forEach(path => {
        console.log(
          chalk.red('  Name: ') + chalk.cyan(path.substr(dirName.length)),
        );
      });
      console.log(
        chalk.red('  Searched in: ') +
          chalk.cyan(
            fs.shortenPathsForTests
              ? relative(basedir, dirName).replace(/\\/g, '/')
              : dirName,
          ),
      );
      process.exit(1);
    }
    return null;
  }
  function configFallback(
    path: string | undefined | null,
    fallbacks: string | string[],
    options: {required: true},
  ): string;
  function configFallback(
    path: string | undefined | null,
    fallbacks: string | string[],
    options?: {required: boolean},
  ): string | null;
  function configFallback(
    path: string | undefined | null,
    fallbacks: string | string[],
    options: {required: boolean} = {required: false},
  ): string | null {
    if (path != null) {
      return resolveApp(path, {required: true});
    }
    if (typeof fallbacks === 'string') {
      return resolveApp(fallbacks, options);
    }
    return firstExistingInApp(fallbacks, options);
  }
  return {
    clientEntryPoint: config.disableClient
      ? null
      : configFallback(
          config.clientEntryPoint,
          [
            'client.tsx',
            'client.ts',
            'client.jsx',
            'client.mjs',
            'client.js',
            'index.tsx',
            'index.ts',
            'index.jsx',
            'index.mjs',
            'index.js',
          ],
          {required: true},
        ),
    dbMigrations: configFallback(config.dbMigrations, 'db-migrations'),
    dbOverrides: configFallback(config.dbOverrides, [
      'db-overrides/index.tsx',
      'db-overrides/index.ts',
      'db-overrides.tsx',
      'db-overrides.ts',
    ]),
    dbSchema: resolve(
      srcDirectory,
      config.dbSchema != null ? config.dbSchema : 'db-schema',
    ),
    dbURL:
      config.dbURL != null ? config.dbURL : process.env.DATABASE_URL || null,
    htmlTemplate: config.disableClient
      ? null
      : configFallback(config.htmlTemplate, 'index.html', {
          required: true,
        }),
    port: config.port == null ? 3000 : config.port,
    publicDirectory: config.disableClient
      ? null
      : configFallback(config.publicDirectory, ['public']),
    serverEntryPointDev: configFallback(
      config.serverEntryPointDev || config.serverEntryPoint,
      [
        'server.dev.tsx',
        'server.dev.ts',
        'server.dev.jsx',
        'server.dev.mjs',
        'server.dev.js',
        'server.tsx',
        'server.ts',
        'server.jsx',
        'server.mjs',
        'server.js',
      ],
      {required: true},
    ),
    serverEntryPointProd: configFallback(
      config.serverEntryPointProd || config.serverEntryPoint,
      [
        'server.prod.tsx',
        'server.prod.ts',
        'server.prod.jsx',
        'server.prod.mjs',
        'server.prod.js',
        'server.tsx',
        'server.ts',
        'server.jsx',
        'server.mjs',
        'server.js',
      ],
      {required: true},
    ),
  };
}
function parseConfigObject(
  basedir: string,
  result: {
    config: object;
    filePath: string;
  } | null,
  fs: Options,
): Config {
  if (result) {
    const absoluteFilePath = fs.realpathSync(
      result.filePath || (result as any).filepath,
    );
    const filePath = relative(basedir, absoluteFilePath).replace(/\\/g, '/');
    basedir = dirname(absoluteFilePath);
    if (!result.config || typeof result.config !== 'object') {
      const msg = filePath + ' should be an object';
      if (fs.logAndExitOnError) {
        console.error(msg);
        process.exit(1);
      }
      throw new Error(msg);
    }

    const config: RawConfig = result.config as any;
    if (config.monorepo !== undefined && typeof config.monorepo !== 'boolean') {
      const msg = filePath + ' .monorepo should be a boolean or undefined.';
      if (fs.logAndExitOnError) {
        console.error(msg);
        process.exit(1);
      }
      throw new Error(msg);
    }
    const validate = config.monorepo
      ? validateMonoRepoConfig
      : validateAppConfig;
    const validated = validate(result.config);
    if (!validated) {
      for (const error of validate.errors || []) {
        const msg =
          config.monorepo &&
          error.keyword === 'minProperties' &&
          error.dataPath === ''
            ? filePath +
              ' is marked as a monorepo but does not have any apps specified.'
            : filePath +
              (error.dataPath.length ? ' ' + error.dataPath : '') +
              ' ' +
              error.message;
        if (fs.logAndExitOnError) {
          console.error(msg);
        } else {
          throw new Error(msg);
        }
      }
      if (fs.logAndExitOnError && validate.errors && validate.errors.length) {
        process.exit(1);
      } else {
        throw new Error('Unknown error validating schema');
      }
    }
    if (config.monorepo) {
      const configs: {[key: string]: AppConfig} = {};
      Object.keys(config).forEach(key => {
        const c = config[key];
        if (key !== 'monorepo') {
          configs[key] = withDefaults(basedir, c === true ? {} : c, fs);
        }
      });
      return {
        monorepo: true,
        configs,
      };
    } else {
      return {
        monorepo: false,
        config: withDefaults(basedir, config, fs),
      };
    }
  }
  return {
    monorepo: false,
    config: withDefaults(basedir, {monorepo: undefined}, fs),
  };
}

export function loadConfigFile(
  filename: string,
  options?: Partial<Options>,
): Config {
  const fs = parseOptions(options);
  filename = fs.realpathSync(filename);
  const result = configLoader.load(null, filename);
  return parseConfigObject(dirname(filename), result, fs);
}
export default function loadConfig(
  basedir: string = process.cwd(),
  options?: Partial<Options>,
): Config {
  const fs = parseOptions(options);
  basedir = fs.realpathSync(basedir);
  const result = configLoader.load(basedir);
  return parseConfigObject(basedir, result, fs);
}
