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
import {prompt} from 'inquirer';
import * as webpack from 'webpack';
import chalk from 'chalk';
import {readdirSync} from 'fs';
import * as Paths from '../helpers/Paths';
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');

const CI = process.env.CI;
const isCI = CI && CI.toLowerCase() !== 'false';
const args = process.argv.slice(3);

async function run() {
  let script: string = args[0];
  if (!script && !isCI) {
    const {answer} = await prompt({
      name: 'answer',
      type: 'list',
      message: 'Which database command would you like to run?',
      choices: [
        {
          name: 'create - Create a database if one does not yet exist.',
          value: 'create',
        },
        {
          name:
            'build-migrations - Build a single entry point for moped database migrations (this happens automatically when you run `moped build` or any of the other `moped db` operations).',
          value: 'build-migrations',
        },
        {
          name:
            'up - Update the database to a newer version by running one or more migrations.',
          value: 'up',
        },
        {
          name:
            'down - Downgrade the database to an older version by reverting one or more migrations.',
          value: 'down',
        },
        {
          name:
            'schema - Generate a typed client from the current database schema.',
          value: 'schema',
        },
      ],
    });
    script = answer;
  }
  switch (script) {
    case 'create':
      await create();
      break;
    case 'build-migrations':
      await buildMigrations();
      break;
    case 'schema':
      await generateSchema();
      break;
    case 'up':
    case 'down':
      await runMigrations(script);
      break;
    default:
      console.log('Unknown script "' + script + '".');
      process.exit(1);
  }
}
run().catch(ex => {
  console.error(ex);
  process.exit(1);
});

async function create() {
  const {default: dbPgCreate} = await import('@moped/db-pg-create');
  await dbPgCreate();
}

async function buildMigrations() {
  const {buildPackage} = await import('@moped/db-pg-migrations');
  await buildPackage({
    migrationsDirectory: Paths.dbMigrations,
    outputFile: Paths.dbMigrationsBundle,
  });
}

function getUpScript(count: 'all' | 'one' | 'last') {
  switch (count) {
    case 'all':
      return 'upAll';
    case 'one':
      return 'upOne';
    case 'last':
      console.error('You cannot run only the "last" up migration.');
      console.error(
        'Perhaps you meant to run: ' + chalk.cyan('moped db up one'),
      );
      process.exit(1);
      throw new Error('Cannot use "up" with "last"');
  }
}
function getDownScript(count: 'all' | 'one' | 'last') {
  switch (count) {
    case 'all':
      return 'downAll';
    case 'one':
      return 'downOne';
    case 'last':
      return 'downLast';
  }
}
function getScript(direction: 'up' | 'down', count: 'all' | 'one' | 'last') {
  switch (direction) {
    case 'up':
      return getUpScript(count);
    case 'down':
      return getDownScript(count);
  }
}
async function runMigrations(direction: 'up' | 'down') {
  let count: string = args[1];
  if (!count && !isCI) {
    const {answer} = await prompt({
      name: 'answer',
      type: 'list',
      message: 'How many database migrations should you run?',
      choices:
        direction === 'up'
          ? [
              {
                name:
                  'all - Upgrade to the very latest version of the database schema.',
                value: 'all',
              },
              {
                name:
                  'one - Run just the oldest migration that has not yet run.',
                value: 'one',
              },
            ]
          : [
              {
                name: 'all - Revert to a completely blank database.',
                value: 'all',
              },
              {
                name: 'one - Revert the most recently run migration.',
                value: 'one',
              },
              {
                name: 'last - Revert the newest migration, if it has been run.',
                value: 'last',
              },
            ],
    });
    count = answer;
  }
  if (count !== 'all' && count !== 'one' && count !== 'last') {
    console.error(
      'To run db up/down you must specify a count of "all", "one" or "last"',
    );
    process.exit(1);
    throw new Error('Invalid count');
  }
  await buildMigrations();
  const method = getScript(direction, count);

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
  const {warnings} = await new Promise<{
    stats: webpack.Stats;
    warnings: string[];
  }>((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        return reject(err);
      }
      const messages = formatWebpackMessages((stats as any).toJson({}, true));
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
  await new Promise((resolve, reject) => {
    (global as any).AUTO_RUN_DB_MIGRATION_PROCESS_DONE = resolve;
    require(Paths.appBuildDirectory + '/temp-db/server');
  });
  await generateSchema();
}
async function generateSchema() {
  const schema = await pgSchema();
  await writeSchema(
    schema,
    Paths.appSourceDirectory + '/db-schema',
    // TODO: this should resolve from a bunch of possibilities
    Paths.appSourceDirectory + '/db-overrides.tsx',
  );
}
