import * as webpack from 'webpack';
import getConfig, {
  Environment,
  Platform,
  SourceKind,
} from '@moped/webpack-config';
import NodeExternals from '@moped/node-builtins';
import {ExternalMode} from '@moped/webpack-config';
import * as Paths from './Paths';
import TypeScriptCheckerPluginInstance from './TypeScriptCheckerPluginInstance';

export interface Options {
  environment: Environment;
  platform: Platform;
  port?: number;
}

const dependencies = Object.keys(
  require(Paths.appPackageJson).dependencies || {},
);

export default function({
  environment,
  platform,
  port,
}: Options): webpack.Configuration {
  return getConfig({
    appNodeModulesDirectory: Paths.appNodeModulesDirectory,
    appSourceDirectory: Paths.appSourceDirectory,
    buildDirectory: {
      server: Paths.appBuildDirectory,
      client: Paths.appBuildDirectoryClient,
    },
    entryPoint: {
      server: {
        development: Paths.appServerDev,
        production: Paths.appServerProd,
      },
      client: Paths.appClient,
    },
    environment,
    externals: {
      server: (context, request) => {
        if (NodeExternals.indexOf(request) !== -1) {
          return {mode: ExternalMode.commonjs, name: request};
        }
        if (
          dependencies.some(name => request.substr(0, name.length) === name)
        ) {
          return {mode: ExternalMode.commonjs, name: request};
        }
        return null;
      },
      client: [],
    },
    platform,
    htmlTemplateFileName: Paths.appHtml,
    plugins: {
      development: [TypeScriptCheckerPluginInstance],
      production: [],
    },
    port,
    sourceKind: SourceKind.TypeScript,
  });
}
