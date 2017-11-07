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
): Promise<Column[]> {
  return connection
    .query(
      sql`
        SELECT column_name, column_default, udt_name, is_nullable
        FROM information_schema.columns
        WHERE table_name = ${tableName} AND table_schema = ${schemaName}
        ORDER BY column_name
      `,
    )
    .then(columns =>
      columns.map(column => {
        return {
          columnName: column.column_name,
          columnDefault: column.column_default,
          udtName: column.udt_name,
          isNullable: column.is_nullable === 'YES',
        };
      }),
    );
}
