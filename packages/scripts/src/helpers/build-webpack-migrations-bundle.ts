import {readdirSync} from 'fs';
import NodeExternals from '@moped/node-builtins';
import getConfig, {
  Environment,
  ExternalMode,
  Platform,
  SourceKind,
} from '@moped/webpack-config';
import buildMigrations from './build-migrations';
import * as Paths from './Paths';

async function run() {
  await buildMigrations();
  const dependencies = readdirSync(Paths.appNodeModulesDirectory);
  const webpack = await import('webpack');
  const compiler = webpack(
    getConfig({
      appNodeModulesDirectory: Paths.appNodeModulesDirectory,
      appSourceDirectory: Paths.appSourceDirectory,
      buildDirectory: Paths.appBuildDirectory + '/temp-db',
      entryPoint: Paths.dbMigrationsBundle,
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
      htmlTemplateFileName: Paths.appHtml,
      sourceKind: SourceKind.TypeScript,
      startServer: false,
    }),
  );
  return await new Promise<{
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
        warnings: messages.warnings,
      });
    });
  });
}

run().then(
  result => console.log(JSON.stringify(result)),
  ex => {
    console.error(ex.stack);
    process.exit(1);
  },
);
