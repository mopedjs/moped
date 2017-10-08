import {existsSync, realpathSync} from 'fs';
import {delimiter, isAbsolute, resolve} from 'path';

export default function loadEnv(
  NODE_ENV: 'development' | 'test' | 'production',
) {
  process.env.BABEL_ENV = NODE_ENV;
  process.env.NODE_ENV = NODE_ENV;

  const DOT_ENV = resolve('.env');

  // https://github.com/bkeepers/dotenv#what-other-env-files-can-i-use
  const dotenvFiles: string[] = [
    `${DOT_ENV}.${NODE_ENV}.local`,
    `${DOT_ENV}.${NODE_ENV}`,
    // Don't include `.env.local` for `test` environment
    // since normally you expect tests to produce the same
    // results for everyone
    NODE_ENV !== 'test' && `${DOT_ENV}.local`,
    DOT_ENV,
  ].filter((value): value is string => typeof value === 'string');

  // Load environment variables from .env* files. Suppress warnings using silent
  // if this file is missing. dotenv will never modify any environment variables
  // that have already been set.
  // https://github.com/motdotla/dotenv
  dotenvFiles.forEach(dotenvFile => {
    if (existsSync(dotenvFile)) {
      require('dotenv').config({
        path: dotenvFile,
      });
    }
  });

  // We support resolving modules according to `NODE_PATH`.
  // This lets you use absolute paths in imports inside large monorepos:
  // https://github.com/facebookincubator/create-react-app/issues/253.
  // It works similar to `NODE_PATH` in Node itself:
  // https://nodejs.org/api/modules.html#modules_loading_from_the_global_folders
  // Note that unlike in Node, only *relative* paths from `NODE_PATH` are honored.
  // Otherwise, we risk importing Node.js core modules into an app instead of Webpack shims.
  // https://github.com/facebookincubator/create-react-app/issues/1023#issuecomment-265344421
  // We also resolve them to make sure all tools using them work consistently.
  const appDirectory = realpathSync(process.cwd());
  process.env.NODE_PATH = (process.env.NODE_PATH || '')
    .split(delimiter)
    .filter(folder => folder && !isAbsolute(folder))
    .map(folder => resolve(appDirectory, folder))
    .join(delimiter);
}
