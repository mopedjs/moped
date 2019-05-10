import {Connection, sql} from '@databases/pg';
import UdtName from './UdtName';

export interface Column {
  columnName: string;
  columnDefault: string | null;
  udtName: UdtName;
  isNullable: boolean;
  comment?: string;
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
      Promise.all(
        columns.map(async column => {
          const description = await connection.query(sql`
            SELECT pgd.description
            FROM pg_catalog.pg_statio_all_tables as st
              inner join pg_catalog.pg_description pgd on (pgd.objoid=st.relid)
              inner join information_schema.columns c on (pgd.objsubid=c.ordinal_position
                and  c.table_schema=st.schemaname and c.table_name=st.relname)
            WHERE
              c.table_name = ${tableName} AND
              c.column_name = ${column.column_name} AND
              table_schema = ${schemaName};
          `);
          return {
            columnName: column.column_name,
            columnDefault: column.column_default,
            udtName: column.udt_name,
            isNullable: column.is_nullable === 'YES',
            comment: description.length
              ? description[0].description
              : undefined,
          };
        }),
      ),
    );
}
