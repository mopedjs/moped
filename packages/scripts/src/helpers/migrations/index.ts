import config from '../config';
import DatabaseMigrationBundle from './DatabaseMigrationBundle';
import getMigrationsPackageDeferred from './getMigrationsPackage';
import getModule from '../worker-farm';
import {MigrationsPackage} from '@moped/db-pg-migrations';
import buildMigrationsBundleType from './buildMigrationsBundle';
import buildWebpackMigrationsBundleType from './buildWebpackMigrationsBundle';

export {DatabaseMigrationBundle};

export const buildMigrationsBundle: typeof buildMigrationsBundleType = getModule(
  require.resolve('./buildMigrationsBundle'),
  ['default'],
  () => import('./buildMigrationsBundle'),
).default;

export const buildWebpackMigrationsBundle: typeof buildWebpackMigrationsBundleType = getModule(
  require.resolve('./buildWebpackMigrationsBundle'),
  ['default'],
  () => import('./buildWebpackMigrationsBundle'),
).default;

function getMigrationsPackage(
  bundle: DatabaseMigrationBundle,
): Promise<MigrationsPackage>;
function getMigrationsPackage(
  bundle: DatabaseMigrationBundle,
  options?: {defer: true},
): () => Promise<MigrationsPackage>;
function getMigrationsPackage(
  bundle: DatabaseMigrationBundle,
  options?: {defer: boolean},
): Promise<MigrationsPackage> | (() => Promise<MigrationsPackage>) {
  if (options && options.defer) {
    return getMigrationsPackageDeferred(bundle);
  } else {
    return getMigrationsPackageDeferred(bundle)();
  }
}
export {getMigrationsPackage};

export function getMigrationBundles(): DatabaseMigrationBundle[] {
  if (config.monorepo) {
    const {configs} = config;
    const migrationsDirectories = new Map<string, DatabaseMigrationBundle>();
    Object.keys(configs).forEach(name => {
      const config = configs[name];
      if (config.dbURL) {
        const cache: DatabaseMigrationBundle = migrationsDirectories.get(
          config.dbURL,
        ) || {
          databaseURL: config.dbURL,
          names: [],
          migrationsDirectory: config.dbMigrations,
          schemaDirectory: config.dbSchema,
          schemaOverrides: config.dbOverrides,
        };
        if (config.dbMigrations !== cache.migrationsDirectory) {
          console.error(
            `${name} has the same DATABASE_URL as ${
              cache.names[0]
            } but they have different migrations directories, this would lead to an inconsistent state.`,
          );
          process.exit(1);
        }
        if (config.dbSchema !== cache.schemaDirectory) {
          console.error(
            `${name} has the same DATABASE_URL as ${
              cache.names[0]
            } but they have different schema directories, please update them to share a single schema directory.`,
          );
          process.exit(1);
        }
        if (config.dbOverrides !== cache.schemaOverrides) {
          console.error(
            `${name} has the same DATABASE_URL as ${
              cache.names[0]
            } but they have different schema overrides, this would cause inconsitent schemas to be generated.`,
          );
          process.exit(1);
        }

        cache.names.push(name);
        cache.names.sort();
        migrationsDirectories.set(config.dbURL, cache);
      }
    });
    return Array.from(migrationsDirectories.entries()).map(([key, config]) => {
      return config;
    });
  } else {
    if (!config.config.dbURL) {
      return [];
    }
    return [
      {
        databaseURL: config.config.dbURL,
        names: [],
        migrationsDirectory: config.config.dbMigrations,
        schemaDirectory: config.config.dbSchema,
        schemaOverrides: config.config.dbOverrides,
      },
    ];
  }
}
