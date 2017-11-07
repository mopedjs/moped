import connect from '@moped/db-pg';
import getTableNames from './getTableNames';
import getTableColumns from './getTableColumns';
import getTablePrimaryKeys from './getTablePrimaryKeys';
import getTypeScriptType from './getTypeScriptType';
import UdtName from './UdtName';

export interface TableSchema {
  tableName: string;
  columns: ColumnSchema[];
}

export interface ColumnSchema {
  columnName: string;
  columnDefault: string | null;
  isNullable: boolean;
  isPrimary: boolean;
  tsType: string;
  udtName: UdtName;
}
export {UdtName};
export interface Options {
  connectionString?: string;
  schema?: string;
}
export default function getSchema(
  options: Options = {},
): Promise<TableSchema[]> {
  const schema = options.schema || 'public';
  const db = connect(options.connectionString);
  return db.task(async db => {
    const tableNames = await getTableNames(db);
    return await Promise.all(
      tableNames.map(async tableName => {
        const primaryKeys = await getTablePrimaryKeys(db, tableName, schema);
        const columns = await getTableColumns(db, tableName, schema);
        return {
          tableName,
          columns: columns.map((column): ColumnSchema => {
            return {
              ...column,
              isPrimary: primaryKeys.indexOf(column.columnName) !== -1,
              tsType: getTypeScriptType(column.udtName),
            };
          }),
        };
      }),
    );
  });
}

module.exports = getSchema;
module.exports.default = getSchema;
module.exports.UdtName = UdtName;
