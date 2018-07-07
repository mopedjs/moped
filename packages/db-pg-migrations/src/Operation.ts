import {Connection} from '@moped/db-pg';

export default interface Operation {
  up: (db: Connection) => Promise<{} | null | void>;
  down: (db: Connection) => Promise<{} | null | void>;
  id: string;
}
