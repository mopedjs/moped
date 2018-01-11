import {isSQLError} from '@moped/db-pg-errors';
import {SQLQuery} from '@moped/sql';
import pg = require('pg-promise');
const {codeFrameColumns} = require('@babel/code-frame');

export interface Connection {
  query(query: SQLQuery): Promise<any[]>;
  task<T>(fn: (connection: Connection) => Promise<T>): Promise<T>;
  tx<T>(fn: (connection: Connection) => Promise<T>): Promise<T>;
}
export interface RootConnection extends Connection {
  dispose(): void;
}
class ConnectionImplementation {
  private connection: IInstanceDisposalManager<pg.IBaseProtocol<{}>>;
  constructor(connection: IInstanceDisposalManager<pg.IBaseProtocol<{}>>) {
    this.connection = connection;
  }
  dispose() {
    this.connection.dispose();
  }
  query(query: SQLQuery): Promise<any[]> {
    if (!(query instanceof SQLQuery)) {
      return Promise.reject(
        new Error(
          'Invalid query, you must use @moped/sql to create your queries.',
        ),
      );
    }
    if (process.env.NODE_ENV === 'development') {
      query.disableMinifying();
    }
    return this.connection.value.query(query).catch(ex => {
      if (isSQLError(ex) && ex.position) {
        const position = parseInt(ex.position, 10);
        const q = query.compile();
        const match =
          /syntax error at or near \"([^\"\n]+)\"/.exec(ex.message) ||
          /relation \"([^\"\n]+)\" does not exist/.exec(ex.message);
        let column = 0;
        let line = 1;
        for (let i = 0; i < position; i++) {
          if (q.text[i] === '\n') {
            line++;
            column = 0;
          } else {
            column++;
          }
        }

        const start = {line, column};
        let end: void | {line: number; column: number} = undefined;
        if (match) {
          end = {line, column: column + match[1].length};
        }

        ex.message += '\n\n' + codeFrameColumns(q.text, {start, end}) + '\n';
      }
      throw ex;
    });
  }
  task<T>(
    fn: (connection: ConnectionImplementation) => Promise<T>,
  ): Promise<T> {
    return this.connection.value.task(t => {
      return fn(new ConnectionImplementation(this.connection.child(t))) as any;
    });
  }
  tx<T>(fn: (connection: ConnectionImplementation) => Promise<T>): Promise<T> {
    return this.connection.value.tx(t => {
      return fn(new ConnectionImplementation(this.connection.child(t))) as any;
    });
  }
}

interface IInstanceDisposalManager<T> {
  readonly value: T;
  isDisposed(): boolean;
  dispose(): void;
  child(value: T): IInstanceDisposalManager<T>;
}
class InstanceDisposalManager<T> {
  private _isDisposed: boolean = false;
  private _dispose: () => void;
  public readonly value: T;
  constructor(value: T, dispose: () => void) {
    this.value = value;
    this._dispose = dispose;
  }
  isDisposed() {
    return this._isDisposed;
  }
  dispose() {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._dispose();
  }
  child(value: T): IInstanceDisposalManager<T> {
    return {
      value,
      isDisposed: () => this.isDisposed(),
      dispose: () => this.dispose(),
      child: value => this.child(value),
    };
  }
}
class GroupDisposalManager<T> {
  private instanceCount: number = 0;
  private _dispose: () => void;
  public disposed: boolean = false;
  public readonly value: T;
  constructor(value: T, dispose: () => void) {
    this.value = value;
    this._dispose = dispose;
  }
  getInstance(): IInstanceDisposalManager<T> {
    if (this.disposed) {
      throw new Error('This group is disposed, you cannot keep using it.');
    }
    this.instanceCount++;
    return new InstanceDisposalManager(this.value, () => {
      this.instanceCount--;
      if (this.instanceCount === 0) {
        this.disposed = true;
        this._dispose();
      }
    });
  }
}

const connections: {
  [connectionString: string]: GroupDisposalManager<pg.IBaseProtocol<{}>>;
} = {};
export default function createConnection(
  connectionString: string | void = process.env.DATABASE_URL,
): RootConnection {
  if (typeof connectionString !== 'string' || !connectionString) {
    throw new Error(
      'You must provide a connection string for @moped/db-pg. You can ' +
        'either pass one directly to the createConnection call or set ' +
        'the DATABASE_URL environment variable.',
    );
  }
  if (connections[connectionString]) {
    return new ConnectionImplementation(
      connections[connectionString].getInstance(),
    );
  }

  const pgp = pg();

  // we force BIG_INTEGER to return as a JavaScript number because we never expect
  // to handle integers larger than 2^52, but want to allow numbers greater than
  // 2^32 in the database
  pgp.pg.types.setTypeParser(20, str => parseInt(str, 10));

  const connection = pgp(connectionString);

  connections[connectionString] = new GroupDisposalManager(connection, () => {
    pgp.end();
    delete connections[connectionString];
  });
  return new ConnectionImplementation(
    connections[connectionString].getInstance(),
  );
}

module.exports = createConnection;
module.exports.default = createConnection;
