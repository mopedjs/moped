import {resolve} from 'path';
import {loadConfigFile} from '../';

function testValid(filename: string, expectedFiles: string[] = []) {
  expectedFiles = expectedFiles.map(filename =>
    resolve(__dirname + '/valid-configs/' + filename),
  );
  test('valid - ' + filename, () => {
    expect(
      loadConfigFile(__dirname + '/valid-configs/' + filename, {
        accessSync: (filename: string) => {
          if (expectedFiles.indexOf(filename) === -1) {
            throw new Error('Unexpected file ' + filename);
          }
        },
        shortenPathsForTests: true,
      }),
    ).toMatchSnapshot();
  });
}
function testInvalid(filename: string, expectedFiles: string[] = []) {
  expectedFiles = expectedFiles.map(filename =>
    resolve(__dirname + '/invalid-configs/' + filename),
  );
  test('invalid - ' + filename, () => {
    expect(() =>
      loadConfigFile(__dirname + '/invalid-configs/' + filename, {
        accessSync: (filename: string) => {
          if (expectedFiles.indexOf(filename) === -1) {
            throw new Error('Unexpected file ' + filename);
          }
        },
        shortenPathsForTests: true,
      }),
    ).toThrowErrorMatchingSnapshot();
  });
}

testValid('basic.json', ['src/server.tsx']);
testValid('monorepo.json', [
  'src/server.tsx',
  'src/client.tsx',
  'src/index.html',
  'src/some-backend-service.ts',
  'src/public',
  'src/db-migrations',
  'src/db-overrides/index.ts',
]);
testInvalid('additional-properties.json');
testInvalid('empty-monorepo.json');
testInvalid('incorrect-type.json');
