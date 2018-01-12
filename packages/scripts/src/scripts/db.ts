// Do this as the first thing so that any code reading it knows the right env.
import '@moped/env/development';
import {readdirSync, writeFileSync} from 'fs';
import {
  MigrationsPackage,
  Migration,
  Direction,
  NumberOfOperations,
} from '@moped/db-pg-migrations';
import getID from '@moped/db-pg-migrations/getID';
import {prompt, Separator} from 'inquirer';
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
          name: 'migrate - Create a new database migration',
          value: 'migrate',
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
          name: 'create - Create a database if one does not yet exist.',
          value: 'create',
        },
        new Separator(),
        {
          name: 'toggle - Manually toggle specific migrations up or down.',
          value: 'toggle',
        },
        {
          name:
            'build-migrations - Build a single entry point for moped database migrations (this happens automatically when you run `moped build` or any of the other `moped db` operations).',
          value: 'build-migrations',
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
    case 'migrate':
      await migrate();
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
    case 'toggle':
      await toggleMigrationsLoop();
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
async function migrate() {
  const {answer} = await prompt({
    name: 'answer',
    type: 'input',
    message:
      'What would you like to call the migration (e.g. add-users-table)?',
  });
  const currentIndex = readdirSync(Paths.dbMigrations)
    .map(name => {
      const match = /^(\d+)\-/.exec(name);
      if (!match) {
        return 0;
      }
      return parseInt(match[1], 10);
    })
    .reduce((a, b) => Math.max(a, b), 0);
  let nextIndex = `${currentIndex + 1}`;
  while (nextIndex.length < 5) {
    nextIndex = '0' + nextIndex;
  }
  writeFileSync(
    Paths.dbMigrations + '/' + nextIndex + '-' + answer + '.ts',
    [
      `import {Connection, sql} from '@moped/db-pg-migrations';`,
      ``,
      `export async function up(db: Connection) {}`,
      ``,
      `export async function down(db: Connection) {}`,
      ``,
      `// Do not edit this unique ID`,
      `export const id = '${getID()}';`,
      ``,
    ].join('\n'),
  );
}

async function buildMigrations() {
  const {default: buildPackage} = await import('../helpers/build-migrations');
  await buildPackage();
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
  const withBundle = getBundle();
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
  if (direction === 'up' && count === 'last') {
    console.error('You cannot run only the "last" up migration.');
    console.error('Perhaps you meant to run: ' + chalk.cyan('moped db up one'));
    process.exit(1);
  }
  await withBundle(async pkg => {
    let hasMigrations = true;
    while (hasMigrations) {
      const migrations = await pkg.runOperation(
        undefined,
        direction as Direction,
        count as NumberOfOperations,
      );
      hasMigrations = !!migrations;
      if (migrations) {
        console.error(chalk.red('Migrations are in an invalid state.'));
        console.error(
          'To fix this, you will have to manually run migrations up or down',
        );
        console.error(
          'until there is a continuous sequence of applied migrations followed',
        );
        console.error('by a continuous sequence of un-applied migrations.');
        if (process.env.CI) {
          process.exit(1);
        }
        const aborted = await toggleMigrations(
          migrations,
          'abort - Abort this operation',
        );
        if (aborted) {
          process.exit(1);
        }
      }
    }
  });
  await generateSchema();
}
async function toggleMigrationsLoop() {
  const withBundle = getBundle();
  return withBundle(async bundle => {
    const migrations = await bundle.getState();
    let aborted = await toggleMigrations(
      migrations,
      'abort - Abort this operation',
    );
    while (!aborted) {
      aborted = await toggleMigrations(migrations, 'end - End this operation');
    }
  });
}
async function toggleMigrations(migrations: Migration[], abortMessage: string) {
  const {answer} = await prompt({
    name: 'answer',
    type: 'list',
    message: 'Select a database migration to toggle:',
    choices: migrations
      .map(m => ({
        name:
          m.name +
          ' - ' +
          (m.isApplied
            ? chalk.green('currently applied')
            : chalk.red('currently not applied')),
        value: m.id,
      }))
      .concat([
        new Separator(),
        {
          name: abortMessage,
          value: 'abort',
        },
      ] as any),
  });
  if (answer === 'abort') {
    return true;
  }
  const migration = migrations.find(m => m.id === answer);
  if (!migration) {
    return true;
  }
  const {confirmation} = await prompt({
    name: 'confirmation',
    type: 'list',
    message: 'How do you want to handle ' + migration.name,
    choices: [
      {
        name: migration.isApplied
          ? 'Revert the migration'
          : 'Apply the migration',
        value: 'run',
      },
      {
        name:
          'Mark the migration as ' +
          (migration.isApplied ? 'down' : 'up') +
          ' without actually ' +
          (migration.isApplied ? 'reverting' : 'applying') +
          ' it.',
        value: 'set',
      },
      new Separator(),
      {
        name: 'abort - Abort this operation',
        value: 'abort',
      },
    ],
  });
  if (confirmation === 'run') {
    if (migration.isApplied) {
      await migration.down();
    } else {
      await migration.up();
    }
  } else if (confirmation === 'set') {
    await migration.setStatus(undefined, !migration.isApplied);
  } else {
    return true;
  }
  return false;
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

function getBundle() {
  const ready = webpackBuildBundle().then(async ({warnings}) => {
    if (isCI && warnings.length) {
      return () => {
        console.log(
          chalk.yellow(
            '\nTreating warnings as errors because process.env.CI = true.\n' +
              'Most CI servers set it automatically.\n',
          ),
        );
        throw new Error(warnings.join('\n\n'));
      };
    }
    const pkg = await new Promise<MigrationsPackage>((resolve, reject) => {
      (global as any).AUTO_RUN_DB_MIGRATION_PROCESS = resolve;
      require(Paths.appBuildDirectory + '/temp-db/server');
    });
    return () => {
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
      return pkg;
    };
  });
  // errors are handled later
  ready.catch(() => {});
  return <T>(fn: (pkg: MigrationsPackage) => Promise<T>) => {
    return ready.then(pkg => fn(pkg()));
  };
}
