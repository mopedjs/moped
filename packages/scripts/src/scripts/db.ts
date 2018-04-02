// Do this as the first thing so that any code reading it knows the right env.
import '@moped/env/development';
import {readdirSync, writeFileSync, mkdirSync, realpathSync} from 'fs';
import {resolve} from 'path';
import {
  Migration,
  Direction,
  NumberOfOperations,
} from '@moped/db-pg-migrations';
import getID from '@moped/db-pg-migrations/getID';
import {prompt, Separator} from 'inquirer';
import chalk from 'chalk';
import {
  DatabaseMigrationBundle,
  buildMigrationsBundle,
  getMigrationBundles,
  getMigrationsPackage,
} from '../helpers/migrations';
import generateSchema from '../helpers/generateSchema';

const CI = process.env.CI;
const isCI = CI && CI.toLowerCase() !== 'false';
const args = process.argv.slice(3);

async function run() {
  const bundles = getMigrationBundles();
  if (bundles.length === 0) {
    console.error(
      'In order to use moped for database migrations you must have a `db-migraitons` directory',
    );
    process.exit(1);
  } else if (bundles.length === 1) {
    await runBundle(bundles[0]);
  } else {
    let name = args.shift();
    if (!name && !isCI) {
      const {answer} = await prompt({
        name: 'answer',
        type: 'list',
        message: "Which app's database would you like to interact with?",
        choices: bundles.map(bundle => ({
          name: `${bundle.names.join(' / ')} - ${bundle.databaseURL}`,
          value: bundle.names[0],
        })),
      });
      name = answer;
    }
    if (!name) {
      console.error(
        "You must specify which app's database you wish to interact with",
      );
      process.exit(1);
      return;
    }
    const n = name;
    const bundle = bundles.filter(b => b.names.indexOf(n) !== -1);
    if (bundle.length === 0) {
      console.error('Could not find the database for "' + n + '"');
      process.exit(1);
      return;
    }
    await runBundle(bundle[0]);
  }
}
async function runBundle(bundle: DatabaseMigrationBundle) {
  let script = args.shift();
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
        {
          name:
            'schema - Generate a typed client from the current database schema.',
          value: 'schema',
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
        new Separator(),
      ],
    });
    script = answer;
  }
  switch (script) {
    case 'create':
      await create(bundle);
      break;
    case 'migrate':
      await migrate(bundle);
      break;
    case 'build-migrations':
      await buildMigrationsBundle(bundle);
      break;
    case 'schema':
      await generateSchema(bundle);
      break;
    case 'up':
    case 'down':
      await runMigrations(bundle, script);
      break;
    case 'toggle':
      await toggleMigrationsLoop(bundle);
      break;
    default:
      console.error('Unknown script "' + script + '".');
      process.exit(1);
  }
}
run().then(
  () => {
    process.exit(0);
  },
  ex => {
    console.error(ex);
    process.exit(1);
  },
);

async function create(bundle: DatabaseMigrationBundle) {
  const {default: dbPgCreate} = await import('@moped/db-pg-create');
  await dbPgCreate(bundle.databaseURL);
}
async function migrate(bundle: DatabaseMigrationBundle) {
  if (!bundle.migrationsDirectory) {
    if (isCI) {
      console.error('There is no migrations directory specified.');
      process.exit(1);
    }

    const {answer} = await prompt({
      name: 'answer',
      type: 'confirm',
      default: true,
      message:
        'There is no migrations directory specified. Would you like to create the deafult directory of "src/db-migrations"',
    });
    if (!answer) {
      process.exit(1);
    }
    const migrationsDirectory = resolve(
      realpathSync(process.cwd()),
      'src/db-migrations',
    );
    mkdirSync(migrationsDirectory);
    bundle.migrationsDirectory = migrationsDirectory;
  }
  const {migrationsDirectory} = bundle;
  const {answer} = await prompt({
    name: 'answer',
    type: 'input',
    message:
      'What would you like to call the migration (e.g. add-users-table)?',
  });
  const currentIndex = readdirSync(migrationsDirectory)
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
    migrationsDirectory + '/' + nextIndex + '-' + answer + '.ts',
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

async function runMigrations(
  bundle: DatabaseMigrationBundle,
  direction: 'up' | 'down',
) {
  if (!bundle.migrationsDirectory) {
    console.error(
      'There is no migrations directory specified. You could run "moped db migrate" to create a database migration',
    );
    process.exit(1);
  }
  let count = args.shift();
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
  const pkgDeferred = getMigrationsPackage(bundle, {defer: true});
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
  const pkg = await pkgDeferred();
  let hasMigrations = true;
  while (hasMigrations) {
    const migrations = await pkg.runOperation(
      bundle.databaseURL,
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
        bundle,
        migrations,
        'abort - Abort this operation',
      );
      if (aborted) {
        process.exit(1);
      }
    }
  }
  await generateSchema(bundle);
}
async function toggleMigrationsLoop(bundle: DatabaseMigrationBundle) {
  const pkg = await getMigrationsPackage(bundle);
  const migrations = await pkg.getState();
  let aborted = await toggleMigrations(
    bundle,
    migrations,
    'abort - Abort this operation',
  );
  while (!aborted) {
    aborted = await toggleMigrations(
      bundle,
      migrations,
      'end - End this operation',
    );
  }
}
async function toggleMigrations(
  bundle: DatabaseMigrationBundle,
  migrations: Migration[],
  abortMessage: string,
) {
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
      await migration.down(bundle.databaseURL);
    } else {
      await migration.up(bundle.databaseURL);
    }
  } else if (confirmation === 'set') {
    await migration.setStatus(bundle.databaseURL, !migration.isApplied);
  } else {
    return true;
  }
  return false;
}
