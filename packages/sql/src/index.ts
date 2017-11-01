import {sql, SQLQuery} from 'pg-sql';

export {SQLQuery};

/**
 * The interface we actually expect people to use.
 */
export interface SQL {
  (strings: TemplateStringsArray, ...values: Array<any>): SQLQuery;

  join(queries: Array<SQLQuery>, seperator?: string): SQLQuery;
  __dangerous__rawValue(text: string): SQLQuery;
  value(value: any): SQLQuery;
  ident(...names: Array<any>): SQLQuery;
}

// Create the SQL interface we export.
const modifiedSQL: SQL = Object.assign(
  (strings: TemplateStringsArray, ...values: Array<any>): SQLQuery =>
    sql(strings, ...values),
  {
    join: sql.join,
    __dangerous__rawValue: sql.raw,
    value: sql.value,
    ident: sql.ident,
  },
);

export default modifiedSQL;
