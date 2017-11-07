import {Connection} from '@moped/db-pg';
import sql from '@moped/sql';
import UdtName from './UdtName';

export interface Column {
  columnName: string;
  columnDefault: string | null;
  udtName: UdtName;
  isNullable: boolean;
}
export default function getTableColumns(
  connection: Connection,
  tableName: string,
  schemaName: string = 'public',
): Promise<string[]> {
  return connection
    .query(
      sql`
        SELECT kc.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kc ON kc.table_name = tc.table_name and kc.table_schema = tc.table_schema AND kc.constraint_name = tc.constraint_name
        WHERE tc.table_schema = ${schemaName} AND tc.table_name = ${tableName}
        AND tc.constraint_type = 'PRIMARY KEY';
      `,
    )
    .then(columns => columns.map(column => column.column_name));
}
