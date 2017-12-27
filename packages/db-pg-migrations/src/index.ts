import connect, {Connection} from '@moped/db-pg';
import sql from '@moped/sql';
import chalk from 'chalk';
import buildPackage from './build-package';

export {buildPackage};

export {Connection, sql};

function takeLast<T>(array: ReadonlyArray<T>): T[] {
  if (array.length > 0) {
    return [array[array.length - 1]];
  }
  return [];
}
function takeFirst<T>(array: ReadonlyArray<T>): T[] {
  if (array.length > 0) {
    return [array[0]];
  }
  return [];
}
enum Direction {
  up,
  down,
}
enum NumberOfOperations {
  All,
  Last,
  One,
}

export interface Operation {
  up: (db: Connection) => Promise<{} | null | void>;
  down: (db: Connection) => Promise<{} | null | void>;
}
export interface Migration {
  id: number;
  name: string;
  operation: () => Promise<Operation>;
}

export function operation(op: Operation): Operation {
  return op;
}

export interface MigrationStatus {
  id: number;
  name: string;
  isApplied: boolean;
  lastUp: Date | null;
  lastDown: Date | null;
}

export interface Options {
  silent?: boolean;
}

export class MigrationsPackage {
  public readonly migrations: ReadonlyArray<Migration>;
  constructor(migrations: Migration[]) {
    this.migrations = migrations;
  }
  private async run<T>(
    connectionString: string | void,
    operation: (db: Connection) => Promise<T>,
  ) {
    const db = connect(connectionString);
    const result = await db.task(async task => {
      task.query(sql`
        CREATE TABLE IF NOT EXISTS "MopedMigrations" (
          "id" INTEGER NOT NULL PRIMARY KEY,
          "name" VARCHAR NOT NULL,
          "isApplied" BOOLEAN NOT NULL DEFAULT FALSE,
          "lastUp" TIMESTAMP,
          "lastDown" TIMESTAMP
        );
      `);
      return await operation(task);
    });
    db.dispose();
    return result;
  }
  getMigrationStatus(id: number, name: string): Promise<MigrationStatus | null>;
  getMigrationStatus(
    connectionString: string,
    id: number,
    name: string,
  ): Promise<MigrationStatus>;
  getMigrationStatus(
    db: Connection,
    id: number,
    name: string,
  ): Promise<MigrationStatus>;
  getMigrationStatus(
    db: Connection | number | string,
    id?: number | string,
    name?: string,
  ): Promise<MigrationStatus> {
    if (typeof db === 'number') {
      const i = db;
      return this.run(undefined, db =>
        this.getMigrationStatus(db, i, id as string),
      );
    }
    if (typeof db === 'string') {
      return this.run(db, db =>
        this.getMigrationStatus(db, id as number, name as string),
      );
    }
    return db.query(sql`SELECT * FROM "MopedMigrations" WHERE "id"=${id}`).then(
      result =>
        result[0] || {
          id,
          name,
          isApplied: false,
          lastUp: null,
          lastDown: null,
        },
    );
  }
  async setMigrationStatus(db: Connection, status: MigrationStatus) {
    await db.query(sql`
      INSERT INTO "MopedMigrations" (
        "id",
        "name",
        "isApplied",
        "lastUp",
        "lastDown"
      )
      VALUES (
        ${status.id},
        ${status.name},
        ${status.isApplied},
        ${status.lastUp},
        ${status.lastDown}
      )
      ON CONFLICT ("id") DO UPDATE SET
        "name" = ${status.name},
        "isApplied" = ${status.isApplied},
        "lastUp" = ${status.lastUp},
        "lastDown" = ${status.lastDown};
    `);
  }

  private runOperation(
    connectionString: string | void,
    direction: Direction,
    numberOfOperations: NumberOfOperations,
    options: Options,
  ) {
    return this.run(connectionString, async db => {
      // get a provisional list of pending operations
      // this is done outside of the transaction and in
      // parallel
      let migrationsToRun = await Promise.all(
        (await Promise.all(
          (numberOfOperations === NumberOfOperations.Last
            ? takeLast(this.migrations)
            : this.migrations
          ).map(async migration => {
            const status = await this.getMigrationStatus(
              db,
              migration.id,
              migration.name,
            );
            return {migration, status};
          }),
        ))
          .filter(({status}): boolean => {
            switch (direction) {
              case Direction.up:
                return !status.isApplied;
              case Direction.down:
                return status.isApplied;
            }
          })
          .map(async ({migration}) => ({
            migration,
            operation: await migration.operation(),
          })),
      );
      if (direction === Direction.down) {
        migrationsToRun.reverse();
      }
      if (numberOfOperations === NumberOfOperations.One) {
        migrationsToRun = takeFirst(migrationsToRun);
      }

      if (migrationsToRun.length) {
        await db.tx(async db => {
          // inside a transaction we check each migration has not yet
          // been applied, thena apply it and update the record of
          // migrations that have been applied
          for (const {migration, operation} of migrationsToRun) {
            if (!options.silent) {
              console.log(
                (direction === Direction.up
                  ? chalk.green('up')
                  : chalk.red('down')) +
                  ' database migration ' +
                  chalk.cyan(migration.name),
              );
            }
            const status = await this.getMigrationStatus(
              db,
              migration.id,
              migration.name,
            );
            if (status.isApplied === (direction === Direction.down)) {
              // migration definitely not yet run, and we're in a transaction, so lets run it
              await (direction === Direction.up
                ? operation.up(db)
                : operation.down(db));
              await this.setMigrationStatus(db, {
                ...status,
                isApplied: direction === Direction.up,
                [direction === Direction.up
                  ? 'lastUp'
                  : 'lastDown']: new Date(),
              });
            }
          }
        });
      }
    });
  }

  upOne(connectionString?: string, options: Options = {}) {
    return this.runOperation(
      connectionString,
      Direction.up,
      NumberOfOperations.One,
      options,
    );
  }
  upAll(connectionString?: string, options: Options = {}) {
    return this.runOperation(
      connectionString,
      Direction.up,
      NumberOfOperations.All,
      options,
    );
  }

  downAll(connectionString?: string, options: Options = {}) {
    return this.runOperation(
      connectionString,
      Direction.down,
      NumberOfOperations.All,
      options,
    );
  }
  downOne(connectionString?: string, options: Options = {}) {
    return this.runOperation(
      connectionString,
      Direction.down,
      NumberOfOperations.One,
      options,
    );
  }
  downLast(connectionString?: string, options: Options = {}) {
    return this.runOperation(
      connectionString,
      Direction.down,
      NumberOfOperations.Last,
      options,
    );
  }
}
export default function migrations(
  ...migrations: Migration[]
): MigrationsPackage {
  const pkg = new MigrationsPackage(migrations);
  const AUTO_RUN_DB_MIGRATION_PROCESS: string | void = (global as any)
    .AUTO_RUN_DB_MIGRATION_PROCESS;
  const AUTO_RUN_DB_MIGRATION_PROCESS_DONE: (() =>
    | void
    | void) = (global as any).AUTO_RUN_DB_MIGRATION_PROCESS_DONE;
  if (AUTO_RUN_DB_MIGRATION_PROCESS) {
    switch (AUTO_RUN_DB_MIGRATION_PROCESS) {
      case 'downAll':
      case 'downLast':
      case 'downOne':
      case 'upAll':
      case 'upOne':
        pkg[AUTO_RUN_DB_MIGRATION_PROCESS]().then(
          () => {
            if (AUTO_RUN_DB_MIGRATION_PROCESS_DONE) {
              AUTO_RUN_DB_MIGRATION_PROCESS_DONE();
            }
          },
          ex => {
            console.error(ex.message);
            process.exit(1);
          },
        );
        break;
    }
  }
  return pkg;
}
