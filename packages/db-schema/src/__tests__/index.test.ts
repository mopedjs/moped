import leaks from './catch-leaks';
import {readFileSync} from 'fs';
import {lsrSync} from 'lsr';
import generate from '../';

// for some reason prettier in jest fails if this isn't required before it is used
require('prettier/parser-typescript');

test('generate', async () => {
  setTimeout(() => {
    const l = leaks.pop();
    if (l) {
      console.error(l.stack);
    }
  }, 5000);
  await generate(
    [
      {
        tableName: 'User',
        columns: [
          {
            columnName: 'id',
            tsType: 'number',
            columnDefault: 'autoincrement',
            isNullable: false,
            isPrimary: true,
          },
          {
            columnName: 'username',
            tsType: 'string',
            columnDefault: null,
            isNullable: false,
            isPrimary: false,
          },
          {
            // e.g. a json field in a postgres db
            columnName: 'profileDocument',
            tsType: 'any',
            columnDefault: null,
            isNullable: false,
            isPrimary: false,
          },
        ],
      },
      {
        tableName: 'Food',
        columns: [
          {
            columnName: 'id',
            tsType: 'number',
            columnDefault: 'autoincrement',
            isNullable: false,
            isPrimary: true,
          },
          {
            columnName: 'name',
            tsType: 'string',
            columnDefault: null,
            isNullable: false,
            isPrimary: false,
          },
          {
            columnName: 'callories',
            tsType: 'number',
            columnDefault: null,
            isNullable: true,
            isPrimary: false,
          },
          {
            columnName: 'averageRating',
            tsType: 'number',
            columnDefault: null,
            isNullable: false,
            isPrimary: false,
          },
        ],
      },
      {
        tableName: 'FavouriteFood',
        columns: [
          {
            columnName: 'userID',
            tsType: 'number',
            columnDefault: null,
            isNullable: false,
            isPrimary: true,
          },
          {
            columnName: 'foodID',
            tsType: 'number',
            columnDefault: null,
            isNullable: false,
            isPrimary: true,
          },
          {
            columnName: 'rating',
            tsType: 'number',
            columnDefault: null,
            isNullable: true,
            isPrimary: false,
          },
        ],
      },
      {
        tableName: 'OnlyPrimaryKey',
        columns: [
          {
            columnName: 'id',
            tsType: 'number',
            columnDefault: 'autoincrement',
            isNullable: false,
            isPrimary: true,
          },
        ],
      },
    ],
    __dirname + '/output',
    __dirname + '/overrides.ts',
  );
  expect(
    lsrSync(__dirname + '/output')
      .map(entry => {
        if (entry.isDirectory()) {
          return 'DIRECTORY: ' + entry.path;
        } else {
          return (
            'FILE: ' +
            entry.path +
            '\n\n' +
            readFileSync(entry.fullPath, 'utf8') +
            '\n'
          );
        }
      })
      .join('\n'),
  ).toMatchSnapshot();
});
