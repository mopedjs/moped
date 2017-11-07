import {Connection} from '@moped/db-pg';
import sql from '@moped/sql';

export default function getTableNames(
  connection: Connection,
  schemaName: string = 'public',
): Promise<string[]> {
  return connection
    .query(
      sql`
        SELECT table_name
        FROM information_schema.columns
        WHERE table_schema = ${schemaName}
        GROUP BY table_name
        ORDER BY table_name
      `,
    )
    .then(tables =>
      tables.map(table => {
        const name = table.table_name;
        if (typeof name !== 'string') {
          throw new Error('Expected table.table_name to be a string');
        }
        return name;
      }),
    );
}
