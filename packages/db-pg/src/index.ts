import {SQLQuery} from '@moped/sql';
import pg = require('pg-promise');

const pgp = pg();

// we force BIG_INTEGER to return as a JavaScript number because we never expect
// to handle integers larger than 2^52, but want to allow numbers greater than
// 2^32 in the database
pgp.pg.types.setTypeParser(20, str => parseInt(str, 10));

export interface Connection {
  query(query: SQLQuery): Promise<any[]>;
  task<T>(fn: (connection: Connection) => Promise<T>): Promise<T>;
  tx<T>(fn: (connection: Connection) => Promise<T>): Promise<T>;
}
class ConnectionImplementation {
  private connection: pg.IBaseProtocol<{}>;
  constructor(connection: pg.IBaseProtocol<{}>) {
    this.connection = connection;
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
  task<T>(fn: (connection: ConnectionImplementation) => Promise<T>): Promise<T> {
    return this.connection.task(t => {
      return fn(new ConnectionImplementation(t)) as any;
    });
  }
  tx<T>(fn: (connection: ConnectionImplementation) => Promise<T>): Promise<T> {
    return this.connection.tx(t => {
      return fn(new ConnectionImplementation(t)) as any;
    });
  }
}

export default function createConnection(
  connectionString: string | void = process.env.DATABASE_CONNECTION,
): Connection {
  if (typeof connectionString !== 'string' || !connectionString) {
    throw new Error(
      'You must provide a connection string for @moped/db-pg. You can ' +
        'either pass one directly to the createConnection call or set ' +
        'the DATABASE_CONNECTION environment variable.',
    );
  }
  const connection = pgp(connectionString);

  return new ConnectionImplementation(connection);
}

module.exports = createConnection;
module.exports.default = createConnection;