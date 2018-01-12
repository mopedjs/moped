import connect, {Connection} from '@moped/db-pg';
import sql from '@moped/sql';
import chalk from 'chalk';

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
  id: string;
}
export interface Migration {
  id: string;
  index: number;
  name: string;
  operation: () => Promise<Operation>;
}

export function operation(op: Operation): Operation {
  return op;
}

export interface MigrationStatus {
  id: string;
  index: number;
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
  private _supportsOn = true;
  constructor(migrations: Migration[]) {
    this.migrations = migrations;
  }
  private async getDefaultVersion(db: Connection) {
    const hasMigrationsTable = await db.query(sql`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'MopedMigrations'
    `);
    return hasMigrationsTable.length ? 1 : 0;
  }
  private async run<T>(
    connectionString: string | void,
    operation: (db: Connection) => Promise<T>,
  ) {
    const db = connect(connectionString);
    const result = await db.task(async task => {
      await task.tx(async tx => {
        await tx.query(sql`
          CREATE TABLE IF NOT EXISTS "MopedMigrationsVersion" (
            "id" INTEGER NOT NULL PRIMARY KEY,
            "version" INTEGER
          );
        `);
        const v = await tx.query(
          sql`SELECT "version" FROM "MopedMigrationsVersion" WHERE "id" = 0`,
        );
        const version: number = v.length
          ? v[0].version
          : await this.getDefaultVersion(tx);

        if (version === 0) {
          await tx.query(sql`
            CREATE TABLE "MopedMigrations" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "index" INTEGER NOT NULL,
              "name" TEXT NOT NULL,
              "isApplied" BOOLEAN NOT NULL DEFAULT FALSE,
              "lastUp" TIMESTAMP,
              "lastDown" TIMESTAMP
            );
          `);
          await tx.query(
            sql`INSERT INTO "MopedMigrationsVersion" ("id", "version") VALUES (0, 2);`,
          );
        } else {
          if (version < 2) {
            const oldMigrations = await tx.query(sql`
              SELECT * FROM "MopedMigrations";
            `);
            await tx.query(sql`DROP TABLE "MopedMigrations";`);
            await tx.query(sql`
              CREATE TABLE "MopedMigrations" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "index" INTEGER NOT NULL,
                "name" TEXT NOT NULL,
                "isApplied" BOOLEAN NOT NULL DEFAULT FALSE,
                "lastUp" TIMESTAMP,
                "lastDown" TIMESTAMP
              );
            `);
            if (oldMigrations.length) {
              await tx.query(
                sql.join(
                  oldMigrations.map(migration => {
                    const index: number = migration.id;
                    const id = this.migrations.find(m => m.index === index)!.id;
                    return sql`
                      INSERT INTO "MopedMigrations" (
                        "id",
                        "index",
                        "name",
                        "isApplied",
                        "lastUp",
                        "lastDown"
                      )
                      VALUES (
                        ${id},
                        ${index},
                        ${migration.name},
                        ${migration.isApplied},
                        ${migration.lastUp},
                        ${migration.lastDown}
                      );
                    `;
                  }),
                  '',
                ),
              );
            }
            await tx.query(
              sql`INSERT INTO "MopedMigrationsVersion" ("id", "version") VALUES (0, 2);`,
            );
          }
        }
      });

      // e.g. PostgreSQL 10.1 on x86_64-apple-darwin16.7.0, compiled by Apple LLVM version 9.0.0 (clang-900.0.38), 64-bit
      const [{version: sqlVersionString}] = await task.query(
        sql`SELECT version();`,
      );
      const match = /PostgreSQL (\d+).(\d+)/.exec(sqlVersionString);
      if (match) {
        const [, major] = match;
        this._supportsOn = parseInt(major, 10) >= 10;
      }

      return await operation(task);
    });
    db.dispose();
    return result;
  }
  getMigrationStatus(migration: Migration): Promise<MigrationStatus>;
  getMigrationStatus(
    connectionString: string,
    migration: Migration,
  ): Promise<MigrationStatus>;
  getMigrationStatus(
    db: Connection,
    migration: Migration,
  ): Promise<MigrationStatus>;
  getMigrationStatus(
    db: Connection | string | Migration,
    migration?: Migration,
  ): Promise<MigrationStatus> {
    if (arguments.length === 1) {
      return this.run(undefined, d =>
        this.getMigrationStatus(d, db as Migration),
      );
    }
    if (typeof db === 'string') {
      return this.run(db, d =>
        this.getMigrationStatus(d, migration as Migration),
      );
    }
    const d = db as Connection;
    const m = migration as Migration;
    return d
      .query(sql`SELECT * FROM "MopedMigrations" WHERE "id"=${m.id}`)
      .then(result => ({
        ...(result[0] || {
          isApplied: false,
          lastUp: null,
          lastDown: null,
        }),
        id: m.id,
        index: m.index,
        name: m.name,
      }));
  }
  async setMigrationStatus(db: Connection, status: MigrationStatus) {
    if (this._supportsOn) {
      await db.query(sql`
        INSERT INTO "MopedMigrations" (
          "id",
          "index",
          "name",
          "isApplied",
          "lastUp",
          "lastDown"
        )
        VALUES (
          ${status.id},
          ${status.index},
          ${status.name},
          ${status.isApplied},
          ${status.lastUp},
          ${status.lastDown}
        )
        ON CONFLICT ("id") DO UPDATE SET
          "index" = ${status.index},
          "name" = ${status.name},
          "isApplied" = ${status.isApplied},
          "lastUp" = ${status.lastUp},
          "lastDown" = ${status.lastDown};
      `);
    } else {
      const [{migrationExists}] = await db.query(sql`
        SELECT count(1) AS "migrationExists"
        FROM "MopedMigrations"
        WHERE id = ${status.id};
      `);
      if (migrationExists) {
        await db.query(sql`
          UPDATE "MopedMigrations" SET
            "index" = ${status.index},
            "name" = ${status.name},
            "isApplied" = ${status.isApplied},
            "lastUp" = ${status.lastUp},
            "lastDown" = ${status.lastDown}
          WHERE "id" = ${status.id};
        `);
      } else {
        await db.query(sql`
          INSERT INTO "MopedMigrations" (
            "id",
            "index",
            "name",
            "isApplied",
            "lastUp",
            "lastDown"
          )
          VALUES (
            ${status.id},
            ${status.index},
            ${status.name},
            ${status.isApplied},
            ${status.lastUp},
            ${status.lastDown}
          );
        `);
      }
    }
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
            const status = await this.getMigrationStatus(db, migration);
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
            const status = await this.getMigrationStatus(db, migration);
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
