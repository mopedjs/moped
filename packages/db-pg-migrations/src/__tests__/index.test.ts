import createDb from '@moped/db-pg-create';
import connect, {Connection} from '@moped/db-pg';
import sql from '@moped/sql';
import output from './output';

jest.setTimeout(30000);

process.env.DATABASE_URL =
  'postgres://moped-db-pg-migrations@localhost/moped-db-pg-migrations';

let db: Connection = null as any;

test('create database', async () => {
  await createDb();
  db = connect();
});

test('clean database', async () => {
  await db.query(sql`
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS "MopedMigrations";
    DROP TABLE IF EXISTS "MopedMigrationsVersion";
  `);
});
test('upAll', async () => {
  await output.upAll(undefined, {silent: true});
  expect(await db.query(sql`SELECT * FROM users`)).toMatchSnapshot();
});
test('downLast', async () => {
  await output.downLast(undefined, {silent: true});
  expect(await db.query(sql`SELECT * FROM users`)).toMatchSnapshot();
  await output.downLast(undefined, {silent: true});
  expect(await db.query(sql`SELECT * FROM users`)).toMatchSnapshot();
  await output.upAll(undefined, {silent: true});
});
async function getError(fn: () => any) {
  try {
    await fn();
  } catch (ex) {
    return ex;
  }
}
test('downOne', async () => {
  await output.downOne(undefined, {silent: true});
  expect(await db.query(sql`SELECT * FROM users`)).toMatchSnapshot();
  await output.downOne(undefined, {silent: true});
  const err = await getError(() => db.query(sql`SELECT * FROM users`));
  expect(() => {
    if (err) throw err;
  }).toThrowErrorMatchingSnapshot();
  await output.upAll(undefined, {silent: true});
});
test('downAll', async () => {
  await output.downAll(undefined, {silent: true});
  const err = await getError(() => db.query(sql`SELECT * FROM users`));
  expect(() => {
    if (err) throw err;
  }).toThrowErrorMatchingSnapshot();
});

test('upOne', async () => {
  await output.upOne(undefined, {silent: true});
  expect(await db.query(sql`SELECT * FROM users`)).toMatchSnapshot();
  await output.upOne(undefined, {silent: true});
  expect(await db.query(sql`SELECT * FROM users`)).toMatchSnapshot();
});
