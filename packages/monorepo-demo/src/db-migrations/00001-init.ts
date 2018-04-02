import {Connection, sql} from '@moped/db-pg-migrations';

export async function up(db: Connection) {
  await db.query(sql`
    CREATE TABLE "Users" (
      "id" BIGSERIAL NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "publicStatus" TEXT NOT NULL DEFAULT '',
      "privateStatus" TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE "UserEmails" (
      "email" TEXT NOT NULL PRIMARY KEY,
      "userID" BIGINT NOT NULL
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

    -- Tokens store temporary secure tokens used to verify e-mail addresses 
    CREATE TABLE "Tokens" (
      "id" BIGSERIAL NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "dos" TEXT NOT NULL,
      "passCodeHash" TEXT NOT NULL,
      "attemptsRemaining" BIGINT NOT NULL,
      "created" BIGINT NOT NULL,
      "expiry" BIGINT NOT NULL,
      "userAgent" TEXT NOT NULL,
      "state" TEXT NOT NULL
    );
    -- Rate limit states are used to rate limit various actions such as password
    -- resets
    CREATE TABLE "RateLimitStates" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "value" BIGINT NOT NULL,
      "timestamp" BIGINT NOT NULL
    );
  `);
}

export async function down(db: Connection) {
  await db.query(sql`
    DROP TABLE "Users";
    DROP TABLE "UserEmails";
    DROP TABLE "Sessions";
    DROP TABLE "Tokens";
    DROP TABLE "RateLimitStates";
  `);
}

// Do not edit this unique ID
export const id = 'd000jcbyi08ktdk0glnc';
