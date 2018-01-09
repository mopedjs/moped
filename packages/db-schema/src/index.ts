import {relative} from 'path';
import Worker from 'then-rpc';
import FileSystem from './FileSystem';
import {OverridesSpec} from './getOverrides';

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
  comment?: string;
}

export default async function generate(
  tables: TableSchema[],
  directory: string,
  overrides?: string,
) {
  const fs = new FileSystem(directory);
  const opaqueProperties = new Map<
    number,
    {
      fileName: string;
      line: number;
      tableName: string;
      columnName: string;
      dbType: string;
    }
  >();
  let overrideSpecPromise: Promise<OverridesSpec> = Promise.resolve({});

  if (overrides) {
    const getOverridesWorker = new Worker({
      filename: require.resolve('./getOverrides'),
      load: () => import('./getOverrides'),
    });
    overrideSpecPromise = getOverridesWorker.run(overrides, (mod, overrides) =>
      mod.default(overrides),
    );
    getOverridesWorker.dispose();
  }
  await fs.mkdirp('/tables');
  await Promise.all([
    // write main db api file
    // N.B. make sure this is always first because it takes a long time
    //      to prettier
    fs.writeFile(
      '/index.ts',
      `
        // Auto generated by @moped/db-schema - do not edit by hand
  
        import sql, {SQLQuery} from '@moped/sql';
        ${tables
          .map(table => {
            return `import ${table.tableName} from './tables/${
              table.tableName
            }';`;
          })
          .join('\n')}
  
        function getOneResult<T>(results: T[]): T | null {
          if (results.length === 0) {
            return null;
          }
          if (results.length === 1) {
            return results[0];
          }
          throw new Error('Expected either one result, or no results to be returned from this query');
        }
        function noop(): void {}
        export interface Connection {
          query(query: SQLQuery): Promise<any[]>;
          task<T>(fn: (connection: Connection) => Promise<T>): Promise<T>;
          tx<T>(fn: (connection: Connection) => Promise<T>): Promise<T>;
        }
        export class APIBase {
          protected db: Connection;
          constructor(db: Connection) {
            this.db = db;
          }
        }
      
        ${tables
          .map(table => {
            let lowerName =
              table.tableName[0].toLowerCase() + table.tableName.substr(1);
            function isColumn(
              identifier: string,
              {notPrimary}: {notPrimary: boolean},
            ) {
              return (
                '(' +
                table.columns
                  .filter(c => !c.isPrimary || !notPrimary)
                  .map(c => `${identifier} === ${JSON.stringify(c.columnName)}`)
                  .join(' || ') +
                ')'
              );
            }
            const primaryKeys = table.columns.filter(
              column => column.isPrimary,
            );
            const idParam =
              primaryKeys.length === 0
                ? ''
                : primaryKeys.length === 1
                  ? `${primaryKeys[0].columnName}: ${
                      table.tableName
                    }[${JSON.stringify(primaryKeys[0].columnName)}],`
                  : `id: {${primaryKeys
                      .map(
                        column =>
                          `${column.columnName}: ${
                            table.tableName
                          }[${JSON.stringify(column.columnName)}],`,
                      )
                      .join('\n')}},`;
            const queryParamExcludingId = table.columns.some(
              column => !column.isPrimary,
            )
              ? `query?: {${table.columns
                  .filter(column => !column.isPrimary)
                  .map(
                    column =>
                      `${column.columnName}?: ${
                        table.tableName
                      }[${JSON.stringify(column.columnName)}],`,
                  )
                  .join('\n')}}`
              : '';
            const idCondition =
              primaryKeys.length === 1
                ? `"${primaryKeys[0].columnName}" = \${${
                    primaryKeys[0].columnName
                  }}`
                : primaryKeys
                    .map(
                      column =>
                        `"${column.columnName}" = \${id.${column.columnName}}`,
                    )
                    .join(' AND ');
            function andQuery(
              baseQuery: string,
              {notPrimary}: {notPrimary: boolean},
            ) {
              return `
                sql.join(
                  [
                    ${baseQuery}
                  ].concat(
                    Object.keys(query)
                      .sort()
                      .filter(fieldName => ${isColumn('fieldName', {
                        notPrimary,
                      })})
                      .map(field => sql\`\${sql.ident(field)} = \${(query as any)[field]}\`),
                  ),
                  ' AND ',
                )
              `;
            }

            return `
              export class ${table.tableName + 'API'} extends APIBase {
                create(${lowerName}: {
                ${table.columns
                  .map(column => {
                    const isOptional =
                      column.isNullable || !!column.columnDefault;
                    return `${column.columnName}${isOptional ? '?' : ''}: ${
                      table.tableName
                    }[${JSON.stringify(column.columnName)}],`;
                  })
                  .join('\n')}
                }${
                  table.columns.every(
                    column => column.isNullable || !!column.columnDefault,
                  )
                    ? ' = {}'
                    : ''
                }): Promise<${table.tableName}> {
                  const columns = Object.keys(${lowerName})
                    .sort()
                    .filter(name => ${table.columns
                      .map(c => `name === ${JSON.stringify(c.columnName)}`)
                      .join(' || ')})
                    .map(name => ({name, value: (${lowerName} as any)[name]}));
                  const data = columns.length ? sql\`(\${sql.join(columns.map(c => sql.ident(c.name)), ',')}) VALUES (\${sql.join(columns.map(c => sql\`\${c.value}\`), ',')})\` : sql\`DEFAULT VALUES\`;
                  let s = sql\`INSERT INTO "${
                    table.tableName
                  }" \${data} RETURNING *;\`;
                  return this.db.query(s).then(results => results[0]);
                }
  
                where(query: SQLQuery): Promise<${table.tableName}[]> {
                  return this.db.query(sql.join([sql\`SELECT * FROM "${
                    table.tableName
                  }"\`, query], ' WHERE '));
                }
  
                list(query?: Partial<${table.tableName}>): Promise<${
              table.tableName
            }[]> {
                  if (query === undefined) {
                    return this.db.query(sql\`SELECT * FROM "${
                      table.tableName
                    }"\`);
                  }
                  return this.where(
                    sql.join(
                      Object.keys(query)
                        .sort()
                        .filter(fieldName => ${isColumn('fieldName', {
                          notPrimary: false,
                        })})
                        .map(field => sql\`\${sql.ident(field)} = \${(query as any)[field]}\`),
                      ' AND ',
                    )
                  );
                }
                ${
                  primaryKeys.length > 0
                    ? `
                    get(${idParam} ${queryParamExcludingId}): Promise<${
                        table.tableName
                      } | null> {
                      ${
                        table.columns.some(column => !column.isPrimary)
                          ? `
                            if (query === undefined) {
                              return this.db.query(sql\`SELECT * FROM "${
                                table.tableName
                              }" WHERE ${idCondition}\`).then(getOneResult);
                            }
                            return this.db.query(
                              ${andQuery(
                                `sql\`SELECT * FROM "${
                                  table.tableName
                                }" WHERE ${idCondition}\``,
                                {notPrimary: true},
                              )}
                            ).then(getOneResult);
                          `
                          : `
                            return this.db.query(
                              sql\`SELECT * FROM "${
                                table.tableName
                              }" WHERE ${idCondition}\`
                            ).then(getOneResult);
                          `
                      }
                    }
                  `
                    : ''
                }
                  ${
                    table.columns.some(column => !column.isPrimary)
                      ? `
                        update(${idParam} ${lowerName}: {${table.columns
                          .filter(column => !column.isPrimary)
                          .map(
                            column =>
                              `${column.columnName}?: ${
                                table.tableName
                              }[${JSON.stringify(column.columnName)}],`,
                          )
                          .join(
                            '\n',
                          )}}, ${queryParamExcludingId}): Promise<void> {
                          const updateColumns =
                            sql.join(
                              Object.keys(${lowerName})
                                .sort()
                                .filter(fieldName => ${isColumn('fieldName', {
                                  notPrimary: true,
                                })})
                                .map(field => sql\`\${sql.ident(field)} = \${(${lowerName} as any)[field]}\`),
                              ', '
                            );
                          
                          if (query === undefined) {
                            return this.db.query(sql\`UPDATE "${
                              table.tableName
                            }" SET \${updateColumns} WHERE ${idCondition}\`).then(noop);
                          }
                          return this.db.query(
                            ${andQuery(
                              `sql\`UPDATE "${
                                table.tableName
                              }" SET \${updateColumns} WHERE ${idCondition}\``,
                              {notPrimary: true},
                            )}
                          ).then(noop);
                        }
                      `
                      : ''
                  }
                  remove(${idParam} ${queryParamExcludingId}): Promise<void> {
                    ${
                      table.columns.some(column => !column.isPrimary)
                        ? `
                          if (!query) {
                            return this.db.query(sql\`DELETE FROM "${
                              table.tableName
                            }" WHERE ${idCondition}\`).then(noop);
                          }
                          return this.db.query(
                            ${andQuery(
                              `sql\`DELETE FROM "${
                                table.tableName
                              }" WHERE ${idCondition}\``,
                              {notPrimary: true},
                            )}
                          ).then(noop);
                        `
                        : `return this.db.query(sql\`DELETE FROM "${
                            table.tableName
                          }" WHERE ${idCondition}\`).then(noop);`
                    }
                  }
              }
            `;
          })
          .join('\n')}
        export default class Database extends APIBase {
          ${tables
            .map(
              table =>
                `private _${table.tableName}: ${table.tableName}API | void;`,
            )
            .join('\n')}
          ${tables
            .map(
              table => `
                get ${table.tableName}(): ${table.tableName}API {
                  return this._${table.tableName} || (this._${
                table.tableName
              } = new ${table.tableName}API(this.db));
                }
              `,
            )
            .join('\n')}
          
          
          task<T>(fn: (connection: Database) => Promise<T>): Promise<T> {
            return this.db.task(db => fn(new Database(db)));
          }
          tx<T>(fn: (connection: Database) => Promise<T>): Promise<T> {
            return this.db.tx(db => fn(new Database(db)));
          }
        }
      `,
    ),
    // Generate table schema files
    overrideSpecPromise.then(overrideSpec =>
      Promise.all(
        tables.map(async table => {
          const overriddenColumns = overrideSpec[table.tableName] || {};
          Object.keys(overriddenColumns).forEach(columnName => {
            if (
              !table.columns.some(column => column.columnName === columnName)
            ) {
              const column = overriddenColumns[columnName]!;
              throw new Error(
                'You cannot override the ' +
                  table.tableName +
                  '.' +
                  columnName +
                  ' column because it does not exit in the database.\n\n' +
                  column.fileName +
                  ' line ' +
                  column.line +
                  '\n\n',
              );
            }
          });
          const importStatement = Object.keys(overriddenColumns).length
            ? 'import * as overrides from ' +
              JSON.stringify(
                relative('/tables/', overrides || '').replace(/\.tsx?$/, ''),
              ) +
              ';\n\n'
            : '';
          await fs.writeFile(
            '/tables/' + table.tableName + '.ts',
            `
              // Auto generated by @moped/db-schema - do not edit by hand

              ${importStatement}
              export default interface Db${table.tableName} {
                ${table.columns
                  .map(column => {
                    const override = overriddenColumns[column.columnName];
                    let tsType =
                      column.tsType + (column.isNullable ? ' | null' : '');
                    if (override) {
                      if (column.isNullable && !override.isNullable) {
                        throw new Error(
                          'You have marked ' +
                            table.tableName +
                            '.' +
                            column.columnName +
                            ' as not-null, but in the database it is nullable.\n\n' +
                            override.fileName +
                            ' line ' +
                            override.line +
                            '\n\n',
                        );
                      }
                      if (!column.isNullable && override.isNullable) {
                        throw new Error(
                          'You have marked ' +
                            table.tableName +
                            '.' +
                            column.columnName +
                            ' as nullable, but in the database it is not-null.\n\n' +
                            override.fileName +
                            ' line ' +
                            override.line +
                            '\n\n',
                        );
                      }
                      if (override.isOpaque) {
                        const previousEntry = opaqueProperties.get(
                          override.opaqueID,
                        );
                        if (!previousEntry) {
                          opaqueProperties.set(override.opaqueID, {
                            fileName: override.fileName,
                            line: override.line,
                            tableName: table.tableName,
                            columnName: column.columnName,
                            dbType: column.tsType,
                          });
                        } else if (previousEntry.dbType !== column.tsType) {
                          throw new Error(
                            'You have marked ' +
                              table.tableName +
                              '.' +
                              column.columnName +
                              ' as having the same type as ' +
                              previousEntry.tableName +
                              '.' +
                              previousEntry.columnName +
                              ' but on the database, the first one is ' +
                              column.tsType +
                              ' and the second one is ' +
                              previousEntry.dbType +
                              '. See:\n\n' +
                              override.fileName +
                              ' line ' +
                              override.line +
                              '\n\nand\n\n' +
                              previousEntry.fileName +
                              ' line ' +
                              previousEntry.line +
                              '\n\n',
                          );
                        }
                      }

                      tsType =
                        'overrides.' +
                        table.tableName +
                        '[' +
                        JSON.stringify(column.columnName) +
                        ']';
                    }
                    const commentParts: string[] = [];
                    if (column.isPrimary) {
                      commentParts.push(`* Primary Key`);
                    }
                    if (column.columnDefault) {
                      commentParts.push(
                        `* Default Value: ${column.columnDefault}`,
                      );
                    }
                    if (column.comment) {
                      column.comment.split('\n').forEach(line => {
                        commentParts.push('* ' + line.trim());
                      });
                    }
                    return `${
                      commentParts.length
                        ? `\n/**\n${commentParts.join('\n')}\n*/\n`
                        : ``
                    }${column.columnName}: ${tsType};`;
                  })
                  .join('\n')}
              }
            `,
          );
        }),
      ),
    ),
    // clean any old files from tables folder
    fs.readDir('/tables').then(files =>
      Promise.all(
        files.map(async filename => {
          const name = filename.replace(/\.ts$/, '');
          if (
            filename === 'index.ts' ||
            (/\.ts/.test(filename) &&
              tables.some(table => table.tableName === name))
          ) {
            return;
          }
          await fs.rimraf('/tables/' + filename);
        }),
      ),
    ),
    // write tables index
    fs.writeFile(
      '/tables/index.ts',
      `
        // Auto generated by @moped/db-schema - do not edit by hand
  
        ${tables
          .map(table => {
            return `import ${table.tableName} from './${table.tableName}';`;
          })
          .join('\n')}
  
        ${tables.map(table => `export {${table.tableName}};`).join('\n')}
      `,
    ),
  ]);
  fs.dispose();
}
