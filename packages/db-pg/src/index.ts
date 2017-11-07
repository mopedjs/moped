import {SQLQuery} from '@moped/sql';
import pg = require('pg-promise');

function noop() {}

export interface Connection {
  query(query: SQLQuery): Promise<any[]>;
  task<T>(fn: (connection: Connection) => Promise<T>): Promise<T>;
  tx<T>(fn: (connection: Connection) => Promise<T>): Promise<T>;
}
export interface RootConnection extends Connection {
  dispose(): void;
}
class ConnectionImplementation {
  private connection: pg.IBaseProtocol<{}>;
  public dispose: () => void;
  constructor(connection: pg.IBaseProtocol<{}>, dispose: () => void) {
    this.connection = connection;
    this.dispose = dispose;
  }
  query(query: SQLQuery): Promise<any[]> {
    if (!(query instanceof SQLQuery)) {
      return Promise.reject(
        new Error(
          'Invalid query, you must use @moped/sql to create your queries.',
        ),
      );
    }
    return this.connection.query(query);
  }
  task<T>(
    fn: (connection: ConnectionImplementation) => Promise<T>,
  ): Promise<T> {
    return this.connection.task(t => {
      return fn(new ConnectionImplementation(t, noop)) as any;
    });
  }
  tx<T>(fn: (connection: ConnectionImplementation) => Promise<T>): Promise<T> {
    return this.connection.tx(t => {
      return fn(new ConnectionImplementation(t, noop)) as any;
    });
  }
}

export default function createConnection(
  connectionString: string | void = process.env.DATABASE_CONNECTION,
): RootConnection {
  if (typeof connectionString !== 'string' || !connectionString) {
    throw new Error(
      'You must provide a connection string for @moped/db-pg. You can ' +
        'either pass one directly to the createConnection call or set ' +
        'the DATABASE_CONNECTION environment variable.',
    );
  }

  const pgp = pg();

  // we force BIG_INTEGER to return as a JavaScript number because we never expect
  // to handle integers larger than 2^52, but want to allow numbers greater than
  // 2^32 in the database
  pgp.pg.types.setTypeParser(20, str => parseInt(str, 10));

  const connection = pgp(connectionString);

  return new ConnectionImplementation(connection, () => pgp.end());
}

module.exports = createConnection;
module.exports.default = createConnection;
