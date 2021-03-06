import connect, {Connection} from '@moped/db-pg';

function con<T>(
  fn: (connection: Connection) => Promise<T>,
): (db?: Connection | string | void) => Promise<T>;
function con<T, TArg1>(
  fn: (connection: Connection, arg1: TArg1) => Promise<T>,
): (db: Connection | string | void, arg1: TArg1) => Promise<T>;
function con<T>(
  fn: (connection: Connection, ...args: any[]) => Promise<T>,
): (db?: Connection | string | void) => Promise<T> {
  async function run(
    db: Connection | string | void,
    ...args: any[]
  ): Promise<T> {
    if (typeof db === 'string' || db === undefined) {
      const connection = connect(db);
      const result = await fn(connection, ...args);
      connection.dispose();
      return result;
    }
    return await fn(db, ...args);
  }
  return run;
}
function tx<T>(
  fn: (tx: Connection) => Promise<T>,
): (db: Connection) => Promise<T> {
  return (db: Connection): Promise<T> => db.tx(fn);
}

export {con, tx};
