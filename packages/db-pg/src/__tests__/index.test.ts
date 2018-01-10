import createDb from '@moped/db-pg-create';
import connect, {Connection} from '../';
import sql from '@moped/sql';

process.env.DATABASE_URL = 'postgres://moped-db-pg@localhost/moped-db-pg';

let db: Connection = null as any;

test('create database', async () => {
  await createDb();
  db = connect();
});

test('error messages', async () => {
  try {
    await db.query(sql`
      SELECT * FROM foo;
      SELECT * FROM bar WHERE id = ${'Hello World, Goodbye World, etc.'};
      SELECT * FRM baz;
      SELECT * FROM bing;
    `);
  } catch (ex) {
    expect(ex.message).toMatchSnapshot();
    return;
  }
  expect(false).toBe(true);
});
