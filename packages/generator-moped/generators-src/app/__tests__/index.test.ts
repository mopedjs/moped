import {readFileSync} from 'fs';
import {lsrSync} from 'lsr';
import {run} from 'yeoman-test';

test('moped-generator', async () => {
  // The object returned acts like a promise, so return it to wait until the process is done
  const dirname = await run(require.resolve('../../../generators/app'))
    // .withOptions({ foo: 'bar' })    // Mock options passed in
    // .withPrompts({ coffee: false }); // Mock the prompt answers
    .withArguments(['name-x']); // Mock the arguments
  expect(
    lsrSync(dirname)
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
