import {Connection} from '@moped/db-pg';
import sql from '@moped/sql';
import MigrationSpec from './MigrationSpec';

async function getDefaultVersion(db: Connection) {
  const hasMigrationsTable = await db.query(sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'MopedMigrations'
  `);
  return hasMigrationsTable.length ? 1 : 0;
}

export default async function prepareMigrationsTable(
  connection: Connection,
  migrations: ReadonlyArray<MigrationSpec>,
) {
  await connection.tx(async tx => {
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
      : await getDefaultVersion(tx);

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
                const id = migrations.find(m => m.index === index)!.id;
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
}
