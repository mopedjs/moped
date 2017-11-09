import {writeFileSync, readFileSync, readdirSync} from 'fs';
import {dirname, relative} from 'path';
import * as ts from 'typescript';
import loadTsConfig from '@moped/load-ts-config';
import {sync as mkdirp} from 'mkdirp';
import {sync as rimraf} from 'rimraf';
const prettier = require('prettier');

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
}

function getSymbolAtLocation(node: ts.Node): ts.Symbol | void {
  return (node as any).symbol;
}

type TableOverride = {
  [columnName: string]: {
    fileName: string;
    line: number;
    isOpaque: boolean;
    isNullable: boolean;
    opaqueID: number;
  };
};
export default async function generate(
  tables: TableSchema[],
  directory: string,
  overrides?: string,
) {
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
  const overrideSpec: {[tableName: string]: TableOverride} = {};
  if (overrides) {
    const tsConfig = loadTsConfig(dirname(overrides), overrides);
    // Build a program using the set of root file names in fileNames
    const program = ts.createProgram([overrides], tsConfig.options as any);
    const checker = program.getTypeChecker();
    const file = program.getSourceFile(overrides);
    const fileSymbol = getSymbolAtLocation(file);
    if (fileSymbol) {
      const exports = checker.getExportsOfModule(fileSymbol);
      exports.forEach(symbol => {
        const tableName = symbol.name;
        const type = checker.getDeclaredTypeOfSymbol(symbol);
        if (type.flags & ts.TypeFlags.Object) {
          const obj: ts.ObjectType = type as any;
          if (obj.objectFlags & ts.ObjectFlags.Interface) {
            const props: TableOverride = (overrideSpec[tableName] = {});
            obj.getProperties().forEach(p => {
              const declaration = p.valueDeclaration!;
              const sourceFile = declaration.getSourceFile();
              const {
                line: baseLine,
                character,
              } = sourceFile.getLineAndCharacterOfPosition(declaration.pos);
              const line =
                baseLine +
                (character >= sourceFile.text.split('\n')[baseLine].length
                  ? 2
                  : 1);
              const property = p.valueDeclaration;

              if (
                property &&
                ts.isPropertySignature(property) &&
                property.type
              ) {
                let pType = checker.getTypeFromTypeNode(property.type);

                let isOpaque = false;
                let isNullable = false;
                let opaqueID = 0;
                if (pType.flags & ts.TypeFlags.Union) {
                  const unionType: ts.UnionType = pType as any;
                  const types = unionType.types;
                  isNullable = types.some(t => !!(t.flags & ts.TypeFlags.Null));
                  const nonNullTypes = types.filter(
                    t => !(t.flags & ts.TypeFlags.Null),
                  );
                  if (nonNullTypes.length === 1) {
                    pType = nonNullTypes[0];
                  }
                }
                if (pType.flags & ts.TypeFlags.Enum) {
                  const enumType: ts.EnumType = pType as any;
                  opaqueID = (enumType as any).id;
                  isOpaque = true;
                }
                props[p.name] = {
                  fileName: sourceFile.fileName,
                  line,
                  isOpaque,
                  isNullable,
                  opaqueID,
                };
              }
            });
          }
        }
      });
    }
  }
  const prettierOptions =
    (await prettier.resolveConfig(directory + '/index.tsx')) || {};
  prettierOptions.parser = 'typescript';
  const writeFile = (filename: string, src: string) => {
    const formatted = prettier.format(src, prettierOptions);
    try {
      if (readFileSync(filename, 'utf8') === formatted) {
        return;
      }
    } catch (ex) {
      if (ex.code !== 'ENOENT') {
        throw ex;
      }
    }
    writeFileSync(filename, formatted);
  };
  mkdirp(directory);
  mkdirp(directory + '/tables');
  tables.forEach(table => {
    const overriddenColumns = overrideSpec[table.tableName] || {};
    Object.keys(overriddenColumns).forEach(columnName => {
      if (!table.columns.some(column => column.columnName === columnName)) {
        const column = overriddenColumns[columnName];
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
          relative(directory + '/tables/', overrides || '').replace(
            /\.tsx?$/,
            '',
          ),
        ) +
        ';\n\n'
      : '';
    writeFile(
      directory + '/tables/' + table.tableName + '.ts',
      `
        ${importStatement}
        export default interface ${table.tableName} {
          ${table.columns
            .map(column => {
              const override = overriddenColumns[column.columnName];
              let tsType = column.tsType + (column.isNullable ? ' | null' : '');
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
                  const previousEntry = opaqueProperties.get(override.opaqueID);
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
              return `${column.columnName}: ${tsType};`;
            })
            .join('\n')}
        }
      `,
    );
  });
  readdirSync(directory + '/tables').forEach(filename => {
    const name = filename.replace(/\.ts$/, '');
    if (
      filename === 'index.ts' ||
      (/\.ts/.test(filename) && tables.some(table => table.tableName === name))
    ) {
      return;
    }
    rimraf(directory + '/tables/' + filename);
  });
  writeFile(
    directory + '/tables/index.ts',
    `
      ${tables
        .map(table => {
          return `import ${table.tableName} from './${table.tableName}';`;
        })
        .join('\n')}

      ${tables
        .map(table => {
          return `export {${table.tableName}};`;
        })
        .join('\n')}
    `,
  );
  writeFile(
    directory + '/index.ts',
    `
      import sql, {SQLQuery} from '@moped/sql';
      ${tables
        .map(table => {
          return `import ${table.tableName} from './tables/${table.tableName}';`;
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
          const primaryKeys = table.columns.filter(column => column.isPrimary);
          const idParam =
            primaryKeys.length === 0
              ? ''
              : primaryKeys.length === 1
                ? `${primaryKeys[0]
                    .columnName}: ${table.tableName}[${JSON.stringify(
                    primaryKeys[0].columnName,
                  )}],`
                : `id: {${primaryKeys
                    .map(
                      column =>
                        `${column.columnName}: ${table.tableName}[${JSON.stringify(
                          column.columnName,
                        )}],`,
                    )
                    .join('\n')}},`;
          const queryParamExcludingId = table.columns.some(
            column => !column.isPrimary,
          )
            ? `query?: {${table.columns
                .filter(column => !column.isPrimary)
                .map(
                  column =>
                    `${column.columnName}?: ${table.tableName}[${JSON.stringify(
                      column.columnName,
                    )}],`,
                )
                .join('\n')}}`
            : '';
          const idCondition =
            primaryKeys.length === 1
              ? `"${primaryKeys[0].columnName}" = \${${primaryKeys[0]
                  .columnName}}`
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
                    .filter(fieldName => ${isColumn('fieldName', {notPrimary})})
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
                  return `${column.columnName}${isOptional
                    ? '?'
                    : ''}: ${table.tableName}[${JSON.stringify(
                    column.columnName,
                  )}],`;
                })
                .join('\n')}
              }${table.columns.every(
                column => column.isNullable || !!column.columnDefault,
              )
                ? ' = {}'
                : ''}): Promise<${table.tableName}> {
                const columns = Object.keys(${lowerName})
                  .sort()
                  .filter(name => ${table.columns
                    .map(c => `name === ${JSON.stringify(c.columnName)}`)
                    .join(' || ')})
                  .map(name => ({name, value: (${lowerName} as any)[name]}));
                const data = columns.length ? sql\`(\${sql.join(columns.map(c => sql.ident(c.name)), ',')}) VALUES (\${sql.join(columns.map(c => sql\`\${c.value}\`), ',')})\` : sql\`DEFAULT VALUES\`;
                let s = sql\`INSERT INTO "${table.tableName}" \${data} RETURNING *;\`;
                return this.db.query(s).then(results => results[0]);
              }

              where(query: SQLQuery): Promise<${table.tableName}[]> {
                return this.db.query(sql.join([sql\`SELECT * FROM "${table.tableName}"\`, query], ' WHERE '));
              }

              list(query?: Partial<${table.tableName}>): Promise<${table.tableName}[]> {
                if (query === undefined) {
                  return this.db.query(sql\`SELECT * FROM "${table.tableName}"\`);
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
              ${primaryKeys.length > 0
                ? `
                  get(${idParam} ${queryParamExcludingId}): Promise<${table.tableName} | null> {
                    ${table.columns.some(column => !column.isPrimary)
                      ? `
                          if (query === undefined) {
                            return this.db.query(sql\`SELECT * FROM "${table.tableName}" WHERE ${idCondition}\`).then(getOneResult);
                          }
                          return this.db.query(
                            ${andQuery(
                              `sql\`SELECT * FROM "${table.tableName}" WHERE ${idCondition}\``,
                              {notPrimary: true},
                            )}
                          ).then(getOneResult);
                        `
                      : `
                          return this.db.query(
                            sql\`SELECT * FROM "${table.tableName}" WHERE ${idCondition}\`
                          ).then(getOneResult);
                        `}
                  }
                `
                : ''}
                ${table.columns.some(column => !column.isPrimary)
                  ? `
                      update(${idParam} ${lowerName}: {${table.columns
                      .filter(column => !column.isPrimary)
                      .map(
                        column =>
                          `${column.columnName}?: ${table.tableName}[${JSON.stringify(
                            column.columnName,
                          )}],`,
                      )
                      .join('\n')}}, ${queryParamExcludingId}): Promise<void> {
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
                          return this.db.query(sql\`UPDATE "${table.tableName}" SET \${updateColumns} WHERE ${idCondition}\`).then(noop);
                        }
                        return this.db.query(
                          ${andQuery(
                            `sql\`UPDATE "${table.tableName}" SET \${updateColumns} WHERE ${idCondition}\``,
                            {notPrimary: true},
                          )}
                        ).then(noop);
                      }
                    `
                  : ''}
                remove(${idParam} ${queryParamExcludingId}): Promise<void> {
                  ${table.columns.some(column => !column.isPrimary)
                    ? `
                        if (!query) {
                          return this.db.query(sql\`DELETE FROM "${table.tableName}" WHERE ${idCondition}\`).then(noop);
                        }
                        return this.db.query(
                          ${andQuery(
                            `sql\`DELETE FROM "${table.tableName}" WHERE ${idCondition}\``,
                            {notPrimary: true},
                          )}
                        ).then(noop);
                      `
                    : `return this.db.query(sql\`DELETE FROM "${table.tableName}" WHERE ${idCondition}\`).then(noop);`}
                }
            }
          `;
        })
        .join('\n')}
    export default class Database extends APIBase {
      ${tables
        .map(
          table => `private _${table.tableName}: ${table.tableName}API | void;`,
        )
        .join('\n')}
      ${tables
        .map(
          table => `
            get ${table.tableName}(): ${table.tableName}API {
              return this._${table.tableName} || (this._${table.tableName} = new ${table.tableName}API(this.db));
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
  );
}
