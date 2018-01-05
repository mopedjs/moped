import {relative, resolve} from 'path';
import * as webpack from 'webpack';
import {Environment, getEnvironment, Platform, getPlatform} from '@moped/enums';
import createConfig, {
  ExternalsElement,
  ExternalMode,
  Target,
} from '@moped/webpack-config-base';
import createCssRule from '@moped/rule-css';
import createTsRule from '@moped/rule-ts';
import createFileRule from '@moped/rule-file';
import * as plugins from '@moped/webpack-plugins';
import getOverride, {Override} from './getOverride';

export {ExternalMode, Environment, Platform};
export enum SourceKind {
  TypeScript = 'ts',
  JavaScript = 'js',
}
export interface Options {
  /**
   * The absolute path to the `node_modules` folder.
   */
  appNodeModulesDirectory: string;
  /**
   * The absolute path to the `src` folder. Loaders for typescript/babel
   * only apply within this folder.
   */
  appSourceDirectory: string;
  /**
   * The folder the output should be placed in, can be different between
   * server and client by passing `{client: 'build/public', server: 'build'}`
   */
  buildDirectory: Override<string>;
  /**
   * The environment, defaults to `process.env.NODE_ENV`
   */
  environment?: Environment;
  /**
   * Modules to exclude from the bundle, useful on the server side.
   */
  externals?: Override<undefined | ExternalsElement | ExternalsElement[]>;
  /**
   * Either server or client
   */
  platform?: Platform;
  plugins?: Override<undefined | webpack.Plugin[]>;
  /**
   * The path to the `index.html` template you want to use
   */
  htmlTemplateFileName: string;
  /**
   * The port to run the backend option (only used in development & server)
   */
  port?: number;
  /**
   * Webpack uses `publicPath` to determine where the app is being served from.
   *
   * This defaults to `/`
   */
  publicPath?: string;
  /**
   * The entry point to your application
   */
  entryPoint: Override<string>;
  /**
   * The babel presets you would like to use. Defaults to an appropriate
   * @moped/bable-preset
   */
  babelPresets?: Override<void | string | string[]>;
  /**
   * Either "ts" for TypeScript or "js" for JavaScript. Select which ever one
   * your source code is written in.
   */
  sourceKind?: SourceKind;

  /**
   * Set this to `false` to not automatically start the server in development mode
   */
  startServer?: boolean;
}

export default function getConfig(options: Options): webpack.Configuration {
  const environment = getEnvironment(options.environment);
  const platform = getPlatform(options.platform, Platform.Client);
  const publicPath = (options.publicPath || '/').replace(/([^\/])$/, '$1/');
  // `publicUrl` is just like `publicPath`, but we will provide it to our app
  // as %PUBLIC_URL% in `index.html` and `process.env.PUBLIC_URL` in JavaScript.
  // Omit trailing slash as %PUBLIC_PATH%/xyz looks better than %PUBLIC_PATH%xyz.
  const publicUrl = (options.publicPath || '/').replace(/\/$/, '');

  const css = createCssRule({environment, platform});

  const babelPresets = getBabelPresets(
    options.babelPresets,
    environment,
    platform,
  );

  const isTypeScript = options.sourceKind === SourceKind.TypeScript;

  const buildDirectory = getOverride(
    options.buildDirectory,
    environment,
    platform,
  );

  return createConfig({
    appNodeModulesDirectory: options.appNodeModulesDirectory,
    appSourceDirectory: options.appSourceDirectory,
    buildDirectory,
    entry: getEntry(options.entryPoint, environment, platform),
    extensions: isTypeScript
      ? ['.web.ts', '.ts', '.web.tsx', '.tsx']
      : undefined,
    externals: getOverride(options.externals, environment, platform),
    target: platform === Platform.Client ? Target.web : Target.node,
    publicPath,
    rules: [
      {
        oneOf: [
          // "url" loader works like "file" loader except that it embeds assets
          // smaller than specified limit in bytes as data URLs to avoid requests.
          // A missing `test` is equivalent to a match.
          {
            test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
            loader: require.resolve('url-loader'),
            options: {
              limit: 10000,
              name: 'static/media/[name].[hash:8].[ext]',
            },
          },
          isTypeScript
            ? createTsRule({
                environment,
                srcDirectory: options.appSourceDirectory,
                babelPresets,
              })
            : getBabelRule(
                options.appSourceDirectory,
                babelPresets,
                environment,
              ),
          css.rule,
          // "file" loader converts assets to urls. It handles all files
          // that fall through the other loaders.
          createFileRule(),
        ],
      },
    ],
    plugins: [css.plugin]
      .concat(getOverride(options.plugins, environment, platform) || [])
      .concat(
        getPlugins(
          {
            appNodeModulesDirectory: options.appNodeModulesDirectory,
            htmlTemplateFileName: options.htmlTemplateFileName,
            port: options.port,
            publicUrl,
            buildDirectory: options.buildDirectory,
            startServer: options.startServer,
          },
          environment,
          platform,
        ),
      ),
  });
}

export function getEntry(
  entryPoint: Override<string>,
  environment: Environment,
  platform: Platform,
): string | string[] {
  const entryPointString = getOverride(entryPoint, environment, platform);

  if (platform === Platform.Client) {
    if (environment === Environment.Development) {
      return [
        require.resolve('react-dev-utils/webpackHotDevClient'),
        require.resolve('@moped/polyfills'),
        entryPointString,
      ];
    } else {
      return [require.resolve('@moped/polyfills'), entryPointString];
    }
  }

  return entryPointString;
}

export function getBabelPresets(
  babelPresets: Override<void | null | string | string[]>,
  environment: Environment,
  platform: Platform,
) {
  const babelPresetsOverride = getOverride(babelPresets, environment, platform);
  if (babelPresetsOverride === null) {
    return undefined;
  }
  if (typeof babelPresetsOverride === 'string') {
    return [babelPresetsOverride];
  }
  if (babelPresetsOverride !== undefined) {
    return babelPresetsOverride;
  }
  return [
    getOverride(
      {
        server: require.resolve('@moped/babel-preset/server-webpack'),
        client: {
          development: require.resolve('@moped/babel-preset/browser-modern'),
          production: require.resolve('@moped/babel-preset/browser'),
          test: require.resolve('@moped/babel-preset/browser'),
        },
      },
      environment,
      platform,
    ),
  ];
}

export function getBabelRule(
  appSourceDirectory: string,
  babelPresets: void | string[],
  environment: Environment,
) {
  return {
    test: /\.(js|jsx|mjs)$/,
    include: appSourceDirectory,
    loader: require.resolve('babel-loader'),
    options: {
      babelrc: false,
      presets: babelPresets,
      compact: environment !== Environment.Development,
      // This is a feature of `babel-loader` for webpack (not Babel itself).
      // It enables caching results in ./node_modules/.cache/babel-loader/
      // directory for faster rebuilds.
      cacheDirectory: environment === Environment.Development,
    },
  };
}

export function getPlugins(
  options: {
    appNodeModulesDirectory: string;
    htmlTemplateFileName: string;
    port?: number;
    publicUrl: string;
    buildDirectory: Override<string>;
    startServer?: boolean;
  },
  environment: Environment,
  platform: Platform,
): webpack.Plugin[] {
  return getOverride<webpack.Plugin[]>(
    {
      client: {
        development: [
          // new ForkTsCheckerWebpackPlugin({
          //   logger: tsLogger,
          //   formatter: 'codeframe',
          // }),
          new plugins.Env({
            ...process.env,
            BUILD_PLATFORM: platform,
            PUBLIC_URL: options.publicUrl,
          }),
          new plugins.Html({
            alwaysWriteToDisk: true,
            outputFileName: 'index.html',
            templateFileName: options.htmlTemplateFileName,
          }),
          new plugins.NamedModules(),
          new plugins.HotModuleReplacement(),
          new plugins.CaseSensitivePaths(),
          new plugins.WatchMissingNodeModules(options.appNodeModulesDirectory),
          new plugins.ReactLoadable({
            filename: resolve(
              getOverride(options.buildDirectory, environment, Platform.Server),
              'react-loadable.json',
            ),
          }),
          new plugins.IgnoreMomentLocales(),
        ],
        production: [
          new plugins.Env({
            ...process.env,
            BUILD_PLATFORM: platform,
            PUBLIC_URL: options.publicUrl,
          }),
          new plugins.Html({
            outputFileName: 'index.html',
            templateFileName: options.htmlTemplateFileName,
            minify: true,
          }),
          new plugins.MinifyJs(),
          new plugins.Manifest(),
          new plugins.ServiceWorker({
            minify: true,
            // For unknown urls we fall back to rendering this page
            navigateFallback: options.publicUrl + '/index.html',
          }),
          new plugins.ReactLoadable({
            filename: resolve(
              getOverride(options.buildDirectory, environment, Platform.Server),
              'react-loadable.json',
            ),
          }),
          new plugins.IgnoreMomentLocales(),
        ],
      },
      server: {
        development: [
          new plugins.NamedModules(),
          new plugins.CaseSensitivePaths(),
          new plugins.CurrentWorkingDirectory(),
          new plugins.WatchMissingNodeModules(options.appNodeModulesDirectory),
          new plugins.IgnoreMomentLocales(),

          // server side plugins
          new webpack.NoEmitOnErrorsPlugin(),
          new plugins.SourceMapSupport(),
        ].concat(
          options.startServer !== false
            ? [
                new plugins.StartServer({
                  name: 'server.js',
                  env: {
                    NODE_ENV: environment,
                    PORT:
                      options.port !== undefined
                        ? '' + options.port
                        : undefined,
                    BUILD_PLATFORM: platform,
                    TEMPLATE_FILE:
                      getOverride(
                        options.buildDirectory,
                        environment,
                        Platform.Client,
                      ) + '/index.html',
                    PUBLIC_URL: options.publicUrl,
                  },
                }),
              ]
            : [],
        ),
        production: [
          new plugins.Env({
            NODE_ENV: environment,
            PROXY_HTML_REQUESTS: process.env.PROXY_HTML_REQUESTS || 'false',
            BUILD_PLATFORM: platform,
            TEMPLATE_FILE: relative(
              getOverride(options.buildDirectory, environment, Platform.Server),
              getOverride(
                options.buildDirectory,
                environment,
                Platform.Client,
              ) + '/index.html',
            ),
            PUBLIC_URL: options.publicUrl,
          }),
          // Minify the code?
          // new plugins.MinifyJs(),
          new plugins.CaseSensitivePaths(),
          new plugins.CurrentWorkingDirectory(),
          new plugins.IgnoreMomentLocales(),
          new plugins.SourceMapSupport(),
        ],
      },
    },
    environment,
    platform,
  );
}

module.exports = getConfig;
module.exports.default = getConfig;
module.exports.ExternalMode = ExternalMode;
module.exports.Environment = Environment;
module.exports.Platform = Platform;
module.exports.SourceKind = SourceKind;
module.exports.getEntry = getEntry;
module.exports.getBabelPresets = getBabelPresets;
module.exports.getBabelRule = getBabelRule;
module.exports.getPlugins = getPlugins;
