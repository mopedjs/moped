import * as webpack from 'webpack';
import getConfig, {
  Environment,
  Platform,
  SourceKind,
  ExternalMode,
} from '@moped/webpack-config';
import NodeExternals from '@moped/node-builtins';
import paths from './paths';
import TypeScriptCheckerPluginInstance from './TypeScriptCheckerPluginInstance';

export interface Options {
  /**
   * {
   *   server: buildDirectory,
   *   client: join(buildDirectory, 'public'),
   * }
   */
  buildDirectory: string;
  /**
   * {
   *   server: {
   *     development: config.serverEntryPointDev,
   *     production: config.serverEntryPointProd,
   *   },
   *   client: config.clientEntryPoint,
   * },
   */
  entryPoint: string;
  environment: Environment;
  htmlTemplate: string | null;
  platform: Platform;
  port?: number;
  onExternalDependency?: (name: string) => void;
}

export default function({
  buildDirectory,
  entryPoint,
  environment,
  htmlTemplate,
  platform,
  port,
  onExternalDependency,
}: Options): webpack.Configuration {
  const dependencies = Object.keys(
    require(paths.packageJSON).dependencies || {},
  );
  return getConfig({
    appNodeModulesDirectory: paths.nodeModulesDirectory,
    appSourceDirectory: paths.sourceDirectory,
    buildDirectory: buildDirectory,
    entryPoint: entryPoint,
    environment,
    externals: {
      server: (context, request) => {
        if (NodeExternals.indexOf(request) !== -1) {
          return {mode: ExternalMode.commonjs, name: request};
        }
        if (
          dependencies.some(name => {
            if (
              request.substr(0, name.length) === name &&
              (request.length === name.length || request[name.length] === '/')
            ) {
              if (onExternalDependency) {
                onExternalDependency(name);
              }
              return true;
            }
            return false;
          }) &&
          // hot reloading requires that start-server is always part of the webpack bundle
          !/^\@moped\/start-server/.test(request)
        ) {
          return {mode: ExternalMode.commonjs, name: request};
        }
        return null;
      },
      client: [],
    },
    platform,
    htmlTemplateFileName: htmlTemplate || undefined,
    plugins: {
      development: [TypeScriptCheckerPluginInstance],
      production: [],
    },
    port,
    sourceKind: SourceKind.TypeScript,
  });
}
