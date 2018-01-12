import {Connection} from '@moped/db-pg';
import sql from '@moped/sql';
import MigrationSpec from './MigrationSpec';
import MigrationStatus from './MigrationStatus';
import Operation from './Operation';
import {con, tx} from './db';

export default class Migration {
  public readonly id: string;
  public readonly index: number;
  public readonly name: string;
  private readonly _operation: () => Promise<Operation>;

  public isApplied: boolean;
  public lastUp: Date | null;
  public lastDown: Date | null;

  private readonly _supportsOn: boolean;

  constructor(
    migration: MigrationSpec,
    status: MigrationStatus | void,
    {supportsOn}: {supportsOn: boolean},
  ) {
    this.id = migration.id;
    this.index = migration.index;
    this.name = migration.name;
    this._operation = migration.operation;

    this.isApplied = !!(status && status.isApplied);
    this.lastUp = status ? status.lastUp : null;
    this.lastDown = status ? status.lastDown : null;

    this._supportsOn = supportsOn;
  }

  getStatus = con(async (db: Connection): Promise<MigrationStatus> => {
    return db
      .query(sql`SELECT * FROM "MopedMigrations" WHERE "id"=${this.id}`)
      .then(result => {
        const status: MigrationStatus = {
          ...(result[0] || {
            isApplied: false,
            lastUp: null,
            lastDown: null,
          }),
          id: this.id,
          index: this.index,
          name: this.name,
        };
        this.isApplied = status.isApplied;
        this.lastUp = status.lastUp;
        this.lastDown = status.lastDown;
        return status;
      });
  });

  up = con(
    tx(async (db: Connection) => {
      const {isApplied} = await this.getStatus(db);
      if (!isApplied) {
        const operation = await this._operation();
        await operation.up(db);
        await this.setStatus(db, true);
      }
    }),
  );

  down = con(
    tx(async (db: Connection) => {
      const {isApplied} = await this.getStatus(db);
      if (isApplied) {
        const operation = await this._operation();
        await operation.down(db);
        await this.setStatus(db, false);
      }
    }),
  );

  setStatus = con(async (db: Connection, isApplied: boolean) => {
    const lastUp = isApplied ? new Date() : this.lastUp;
    const lastDown = isApplied ? this.lastDown : new Date();
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
          ${this.id},
          ${this.index},
          ${this.name},
          ${isApplied},
          ${lastUp},
          ${lastDown}
        )
        ON CONFLICT ("id") DO UPDATE SET
          "index" = ${this.index},
          "name" = ${this.name},
          "isApplied" = ${isApplied},
          "lastUp" = ${lastUp},
          "lastDown" = ${lastDown};
      `);
    } else {
      const [{migrationExists}] = await db.query(sql`
        SELECT count(1) AS "migrationExists"
        FROM "MopedMigrations"
        WHERE id = ${this.id};
      `);
      if (migrationExists) {
        await db.query(sql`
          UPDATE "MopedMigrations" SET
            "index" = ${this.index},
            "name" = ${this.name},
            "isApplied" = ${isApplied},
            "lastUp" = ${lastUp},
            "lastDown" = ${lastDown}
          WHERE "id" = ${this.id};
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
            ${this.id},
            ${this.index},
            ${this.name},
            ${isApplied},
            ${lastUp},
            ${lastDown}
          );
        `);
      }
    }
    this.isApplied = isApplied;
    this.lastUp = lastUp;
    this.lastDown = lastDown;
  });
}
