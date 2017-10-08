import {basename} from 'path';

// This is a custom Jest transformer turning file imports into filenames.
// http://facebook.github.io/jest/docs/tutorial-webpack.html

export function process(src: string, filename: string): string {
  return `module.exports = ${JSON.stringify(basename(filename))};`;
}
