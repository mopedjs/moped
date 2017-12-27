import {Connection, sql} from '@moped/db-pg-migrations';

export async function up(db: Connection) {
  await db.query(sql`
    CREATE TABLE "Users" (
      "id" BIGSERIAL NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL
    );
    CREATE TABLE "Sessions" (
      "id" BIGSERIAL NOT NULL PRIMARY KEY,
      "userID" BIGINT NOT NULL,
      "created" TIMESTAMP NOT NULL,
      "lastSeen" TIMESTAMP NOT NULL,
      "userAgent" TEXT
    );
    COMMENT ON COLUMN "Sessions"."userID" IS 'The user account that is logged in.';
    COMMENT ON COLUMN "Sessions"."created" IS 'The time that the user logged in.';
    COMMENT ON COLUMN "Sessions"."lastSeen" IS 'The time that the user last accessed the web site.';
    COMMENT ON COLUMN "Sessions"."userAgent" IS 'The user agent of the browser this session is associated with.';
  `);
}
export async function down(db: Connection) {
  await db.query(sql`
    DROP TABLE "Users";
    DROP TABLE "Sessions";
  `);
}
