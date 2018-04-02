import {join} from 'path';
import buildPackage from '@moped/db-pg-migrations/build-package';
import DatabaseMigrationBundle from './DatabaseMigrationBundle';

export default async function buildMigrationsBundle(
  bundle: DatabaseMigrationBundle,
) {
  if (!bundle.migrationsDirectory) {
    throw new Error('No migraitons directory was specified');
  }
  const bundleLocation = join(bundle.migrationsDirectory, 'bundle.ts');
  await buildPackage({
    migrationsDirectory: bundle.migrationsDirectory,
    outputFile: bundleLocation,
  });
  return bundleLocation;
}
