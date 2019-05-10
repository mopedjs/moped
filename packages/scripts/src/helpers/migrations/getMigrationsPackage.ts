import {MigrationsPackage} from '@databases/pg-migrations';
import chalk from 'chalk';
import {DatabaseMigrationBundle, buildWebpackMigrationsBundle} from './';

const CI = process.env.CI;
const isCI = CI && CI.toLowerCase() !== 'false';

export default function getMigrationsPackage(bundle: DatabaseMigrationBundle) {
  const ready = buildWebpackMigrationsBundle(bundle).then(
    async ({warnings, filename}) => {
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
        require(filename);
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
    },
  );
  // errors are handled later
  ready.catch(() => {});
  return () => ready.then(pkg => pkg());
}
