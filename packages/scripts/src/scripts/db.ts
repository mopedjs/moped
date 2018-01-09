// Do this as the first thing so that any code reading it knows the right env.});
import '@moped/env/development';
import {prompt} from 'inquirer';
import chalk from 'chalk';
import * as Paths from '../helpers/Paths';
import * as spawn from '../helpers/spawn';

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
  const {default: buildPackage} = await import('../helpers/build-migrations');
  await buildPackage();
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
  let promptResult: null | Promise<any> = null;
  if (!count && !isCI) {
    promptResult = prompt({
      name: 'answer',
      type: 'list',
      message: 'How many database migrations should you run?',
      default: direction === 'up' ? 'all' : 'last',
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
    // we handle errors later
    promptResult.catch(() => {});
  }
  const webpackBundlePromise = webpackBuildBundle();
  // we handle errors later
  webpackBundlePromise.catch(() => {});
  if (promptResult) {
    const {answer} = await promptResult;
    count = answer;
  }
  if (count !== 'all' && count !== 'one' && count !== 'last') {
    console.error(
      'To run db up/down you must specify a count of "all", "one" or "last"',
    );
    process.exit(1);
    throw new Error('Invalid count');
  }
  const method = getScript(direction, count);
  const {warnings} = await webpackBundlePromise;
  if (warnings.length) {
    if (isCI && warnings.length) {
      console.log(
        chalk.yellow(
          '\nTreating warnings as errors because process.env.CI = true.\n' +
            'Most CI servers set it automatically.\n',
        ),
      );
      throw new Error(warnings.join('\n\n'));
    }
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
    (global as any).AUTO_RUN_DB_MIGRATION_PROCESS = method;
    (global as any).AUTO_RUN_DB_MIGRATION_PROCESS_DONE = resolve;
    require(Paths.appBuildDirectory + '/temp-db/server');
  });
  await generateSchema();
}
async function generateSchema() {
  const {default: pgSchema} = await import('@moped/db-pg-schema');
  const {default: writeSchema} = await import('@moped/db-schema');
  const schema = await pgSchema();
  await writeSchema(
    schema,
    Paths.appSourceDirectory + '/db-schema',
    Paths.dbOverrides || undefined,
  );
}

async function webpackBuildBundle(): Promise<{warnings: string[]}> {
  const str = await spawn.spawnAsync('node', [
    require.resolve('../helpers/build-webpack-migrations-bundle'),
  ]);
  return JSON.parse(str.substring(str.indexOf('{'), str.lastIndexOf('}') + 1));
}
