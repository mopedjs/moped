// Do this as the first thing so that any code reading it knows the right env.});
import '@moped/env/development';
import chalk from 'chalk';
import {MigrationsPackage} from '@moped/db-pg-migrations';
import * as Paths from '../helpers/Paths';

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
        .then(() => require('ts-node/register'))
        .then<{default: MigrationsPackage}>(() =>
          import(Paths.dbMigrationsBundle),
        )
        .then(m => m.default)
        .then(pkg => {
          switch (script) {
            case 'up':
              switch (count) {
                case 'all':
                  return pkg.upAll();
                case 'one':
                  return pkg.upOne();
              }
              break;
            case 'down':
              switch (count) {
                case 'all':
                  return pkg.downAll();
                case 'one':
                  return pkg.downOne();
                case 'last':
                  return pkg.downLast();
              }
              break;
          }
          return undefined;
        })
        .catch(ex => {
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
