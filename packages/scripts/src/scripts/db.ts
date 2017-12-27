// Do this as the first thing so that any code reading it knows the right env.});
import '@moped/env/development';
import NodeExternals from '@moped/node-builtins';
import getConfig, {
  Environment,
  Platform,
  SourceKind,
  ExternalMode,
} from '@moped/webpack-config';
import pgSchema from '@moped/db-pg-schema';
import writeSchema from '@moped/db-schema';
import * as webpack from 'webpack';
import chalk from 'chalk';
import {readdirSync} from 'fs';
import * as Paths from '../helpers/Paths';
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');

const CI = process.env.CI;
const isCI = CI && CI.toLowerCase() !== 'false';

const args = process.argv.slice(2);
const validScripts = ['create', 'build-migrations', 'up', 'down'];

const scriptIndex = args.findIndex(x => validScripts.some(y => x === y));
const script = scriptIndex === -1 ? args[0] : args[scriptIndex];

if (validScripts.some(x => script === x)) {
  switch (script) {
    case 'create':
      import('@moped/db-pg-create')
        .then(
          dbPgCreate => dbPgCreate.default(),
          ex => {
            console.error('Could not load @moped/db-pg-create');
            console.error('This could be because it is not installed');
            console.error('To install it, run:');
            console.error('');
            console.error('  ' + chalk.cyan('yarn add -D @moped/db-pg-create'));
            console.error('');
            process.exit(1);
          },
        )
        .catch(ex => {
          console.error(ex);
          process.exit(1);
        });
      break;
    case 'build-migrations':
      import('@moped/db-pg-migrations')
        .then(migrations =>
          migrations.buildPackage({
            migrationsDirectory: Paths.dbMigrations,
            outputFile: Paths.dbMigrationsBundle,
          }),
        )
        .catch(ex => {
          console.error(ex);
          process.exit(1);
        });
      break;
    case 'up':
    case 'down':
      const count = args[scriptIndex + 1];
      switch (count) {
        case 'all':
        case 'one':
          break;
        case 'last':
          if (script === 'up') {
            console.error('You cannot run only the "last" up migration.');
            console.error(
              'Perhaps you meant to run: ' + chalk.cyan('moped db up one'),
            );
            process.exit(1);
          }
          break;
        default:
          console.error(
            'To run db up/down you must specify a count of "all", "one" or "last"',
          );
          process.exit(1);
      }
      import('@moped/db-pg-migrations')
        .then(migrations =>
          migrations.buildPackage({
            migrationsDirectory: Paths.dbMigrations,
            outputFile: Paths.dbMigrationsBundle,
          }),
        )
        .then(() => {
          // Paths.dbMigrationsBundle
          switch (script) {
            case 'up':
              switch (count) {
                case 'all':
                  return 'upAll';
                case 'one':
                  return 'upOne';
              }
              break;
            case 'down':
              switch (count) {
                case 'all':
                  return 'downAll';
                case 'one':
                  return 'downOne';
                case 'last':
                  return 'downLast';
              }
              break;
          }
          return undefined;
        })
        .then(method => {
          (global as any).AUTO_RUN_DB_MIGRATION_PROCESS = method;
          const dependencies = readdirSync(Paths.appNodeModulesDirectory);
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
                  dependencies.some(
                    name => request.substr(0, name.length) === name,
                  )
                ) {
                  return {mode: ExternalMode.commonjs, name: request};
                }
                if (request[0] !== '.') {
                  try {
                    if (
                      require.resolve(request).indexOf('node_modules') !== -1
                    ) {
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
          return new Promise<{
            stats: webpack.Stats;
            warnings: string[];
          }>((resolve, reject) => {
            compiler.run((err, stats) => {
              if (err) {
                return reject(err);
              }
              const messages = formatWebpackMessages(
                (stats as any).toJson({}, true),
              );
              if (messages.errors.length) {
                return reject(new Error(messages.errors.join('\n\n')));
              }
              if (isCI && messages.warnings.length) {
                console.log(
                  chalk.yellow(
                    '\nTreating warnings as errors because process.env.CI = true.\n' +
                      'Most CI servers set it automatically.\n',
                  ),
                );
                return reject(new Error(messages.warnings.join('\n\n')));
              }
              return resolve({
                stats,
                warnings: messages.warnings,
              });
            });
          });
        })
        .then(({warnings}) => {
          if (warnings.length) {
            console.log(chalk.yellow('Compiled with warnings.\n'));
            console.log(warnings.join('\n\n'));
            console.log(
              '\nSearch for the ' +
                chalk.underline(chalk.yellow('keywords')) +
                ' to learn more about each warning.',
            );
            console.log(
              'To ignore, add ' +
                chalk.cyan('// eslint-disable-next-line') +
                ' to the line before.\n',
            );
          }
        })
        .then(
          () =>
            new Promise((resolve, reject) => {
              (global as any).AUTO_RUN_DB_MIGRATION_PROCESS_DONE = resolve;
              require(Paths.appBuildDirectory + '/temp-db/server');
            }),
        )
        .then(() => generateSchema())
        .catch(ex => {
          console.error(ex);
          process.exit(1);
        });
      break;
    case 'schema':
      generateSchema().catch(ex => {
        console.error(ex);
        process.exit(1);
      });
      break;
  }
} else {
  console.log('Unknown script "' + script + '".');
  // console.log('Perhaps you need to update react-scripts?');
  // console.log(
  //   'See: https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md#updating-to-new-releases',
  // );
  process.exit(1);
}
function generateSchema() {
  return pgSchema().then(schema =>
    writeSchema(
      schema,
      Paths.appSourceDirectory + '/db-schema',
      // TODO: this should resolve from a bunch of possibilities
      Paths.appSourceDirectory + '/db-overrides.tsx',
    ),
  );
}
