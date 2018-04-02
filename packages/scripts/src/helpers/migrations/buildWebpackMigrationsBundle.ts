import {join} from 'path';
import {readdirSync} from 'fs';
import webpack = require('webpack');
import NodeExternals from '@moped/node-builtins';
import getConfig, {
  Environment,
  ExternalMode,
  Platform,
  SourceKind,
} from '@moped/webpack-config';
import buildMigrationsBundle from './buildMigrationsBundle';
import DatabaseMigrationBundle from './DatabaseMigrationBundle';
import paths from '../paths';

export default async function buildWebpackMigrationsBundle(
  bundle: DatabaseMigrationBundle,
) {
  const bundleLocation = await buildMigrationsBundle(bundle);
  const dependencies = readdirSync(paths.nodeModulesDirectory);
  const buildDirectory = bundle.names.length
    ? join(paths.buildDirectory, bundle.names.sort().join('_'), 'db-migrations')
    : join(paths.buildDirectory, 'db-migrations');
  const compiler = webpack(
    getConfig({
      appNodeModulesDirectory: paths.nodeModulesDirectory,
      appSourceDirectory: paths.sourceDirectory,
      buildDirectory,
      entryPoint: bundleLocation,
      environment: Environment.Development,
      externals: (context, request) => {
        if (NodeExternals.indexOf(request) !== -1) {
          return {mode: ExternalMode.commonjs, name: request};
        }
        if (
          dependencies.some(name => request.substr(0, name.length) === name)
        ) {
          return {mode: ExternalMode.commonjs, name: request};
        }
        if (request[0] !== '.') {
          try {
            if (require.resolve(request).indexOf('node_modules') !== -1) {
              return {mode: ExternalMode.commonjs, name: request};
            }
          } catch (ex) {}
        }
        return null;
      },
      platform: Platform.Server,
      sourceKind: SourceKind.TypeScript,
      startServer: false,
    }),
  );
  return await new Promise<{
    filename: string;
    warnings: string[];
  }>((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        return reject(err);
      }
      const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
      const messages = formatWebpackMessages((stats as any).toJson({}, true));
      if (messages.errors.length) {
        return reject(new Error(messages.errors.join('\n\n')));
      }
      return resolve({
        filename: join(buildDirectory, 'server.js'),
        warnings: messages.warnings,
      });
    });
  });
}
