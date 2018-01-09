import buildPackage from '@moped/db-pg-migrations/build-package';
import * as Paths from './Paths';

export default async function buildMigrations() {
  await buildPackage({
    migrationsDirectory: Paths.dbMigrations,
    outputFile: Paths.dbMigrationsBundle,
  });
}
