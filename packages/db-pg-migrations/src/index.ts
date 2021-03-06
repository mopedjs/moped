import chalk from 'chalk';
import connect, {Connection} from '@moped/db-pg';
import sql from '@moped/sql';
import Operation from './Operation';
import Migration from './Migration';
import MigrationSpec from './MigrationSpec';
import MigrationStatus from './MigrationStatus';
import getPgVersion from './getPgVersion';
import prepareMigrationsTable from './prepareMigrationsTable';

export {Connection, sql, Migration, MigrationSpec, Operation};

export enum Direction {
  up = 'up',
  down = 'down',
}
export enum NumberOfOperations {
  all = 'all',
  last = 'last',
  one = 'one',
}

export function operation(op: Operation): Operation {
  return op;
}

export interface Options {
  silent?: boolean;
  interactive?: boolean;
}
export class MigrationsPackage {
  public readonly migrations: ReadonlyArray<MigrationSpec>;
  private _supportsOn = true;
  constructor(migrations: MigrationSpec[]) {
    this.migrations = migrations;
  }
  private async run<T>(
    db: Connection | string | void,
    operation: (db: Connection, migrations: Migration[]) => Promise<T>,
  ): Promise<T> {
    if (typeof db === 'string' || db === undefined) {
      const connection = connect(db);
      const result = await this.run(connection, operation);
      connection.dispose();
      return result;
    }
    return await db.task(async task => {
      await prepareMigrationsTable(task, this.migrations);
      const [major] = await getPgVersion(task);
      this._supportsOn = major >= 10;

      const migrations: MigrationStatus[] = await db.query(
        sql`SELECT * FROM "MopedMigrations"`,
      );

      return await operation(
        task,
        this.migrations.map(
          migration =>
            new Migration(
              migration,
              migrations.find(m => m.id === migration.id),
              {supportsOn: this._supportsOn},
            ),
        ),
      );
    });
  }

  checkState(migrations: ReadonlyArray<Migration>) {
    let applied = true;
    return migrations.every(migration => {
      if (!migration.isApplied) {
        applied = false;
      }
      return migration.isApplied === applied;
    });
  }

  getState(db?: Connection | string | void) {
    return this.run(db, async (db, migrations) => {
      return migrations;
    });
  }

  runOperation(
    connectionString: string | void,
    direction: Direction,
    numberOfOperations: NumberOfOperations,
    options: Options = {},
  ) {
    return this.run(connectionString, async (db, migrations) => {
      if (!this.checkState(migrations)) {
        return migrations;
      }
      switch (direction) {
        case Direction.up:
          if (numberOfOperations === NumberOfOperations.last) {
            throw new Error(
              'You cannot use "last" with "up", because it does not make sense to skip intermediate migrations.',
            );
          }
          for (const m of migrations) {
            if (!m.isApplied) {
              if (!options.silent) {
                console.log(
                  chalk.green('applying') +
                    ' database migration ' +
                    chalk.cyan(m.name),
                );
              }
              await m.up(db);
              if (numberOfOperations === NumberOfOperations.one) {
                return;
              }
            }
          }
          break;
        case Direction.down:
          for (const m of migrations.slice().reverse()) {
            if (m.isApplied) {
              if (!options.silent) {
                console.log(
                  chalk.red('reverting') +
                    ' database migration ' +
                    chalk.cyan(m.name),
                );
              }
              await m.down(db);
              if (numberOfOperations === NumberOfOperations.one) {
                return;
              }
            }
            if (numberOfOperations === NumberOfOperations.last) {
              return;
            }
          }
          break;
      }
      return;
    });
  }

  upOne(connectionString?: string, options: Options = {}) {
    return this.runOperation(
      connectionString,
      Direction.up,
      NumberOfOperations.one,
      options,
    );
  }
  upAll(connectionString?: string, options: Options = {}) {
    return this.runOperation(
      connectionString,
      Direction.up,
      NumberOfOperations.all,
      options,
    );
  }

  downAll(connectionString?: string, options: Options = {}) {
    return this.runOperation(
      connectionString,
      Direction.down,
      NumberOfOperations.all,
      options,
    );
  }
  downOne(connectionString?: string, options: Options = {}) {
    return this.runOperation(
      connectionString,
      Direction.down,
      NumberOfOperations.one,
      options,
    );
  }
  downLast(connectionString?: string, options: Options = {}) {
    return this.runOperation(
      connectionString,
      Direction.down,
      NumberOfOperations.last,
      options,
    );
  }
}
export default function migrations(
  ...migrations: MigrationSpec[]
): MigrationsPackage {
  const pkg = new MigrationsPackage(migrations);
  const AUTO_RUN_DB_MIGRATION_PROCESS: any = (global as any)
    .AUTO_RUN_DB_MIGRATION_PROCESS;
  if (AUTO_RUN_DB_MIGRATION_PROCESS) {
    AUTO_RUN_DB_MIGRATION_PROCESS(pkg);
  }
  return pkg;
}
