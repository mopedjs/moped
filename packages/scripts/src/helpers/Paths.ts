import {realpathSync, accessSync} from 'fs';
import {resolve, dirname, basename} from 'path';
import chalk from 'chalk';

const F_OK: number = require('fs').F_OK;

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebookincubator/create-react-app/issues/637
const appDirectory = realpathSync(process.cwd());
function resolveApp(
  relativePath: string,
  options: {required: boolean} = {required: false},
) {
  const filePath = resolve(appDirectory, relativePath);
  if (options.required) {
    try {
      accessSync(filePath, F_OK);
    } catch (err) {
      var dirName = dirname(filePath);
      var fileName = basename(filePath);
      console.log(chalk.red('Could not find a required file.'));
      console.log(chalk.red('  Name: ') + chalk.cyan(fileName));
      console.log(chalk.red('  Searched in: ') + chalk.cyan(dirName));
      process.exit(1);
    }
  }
  return filePath;
}
function firstExistingInApp(paths: string[]): string | null;
function firstExistingInApp(paths: string[], options: {required: true}): string;
function firstExistingInApp(
  paths: string[],
  options: {required: boolean} = {required: false},
) {
  for (const path of paths) {
    try {
      const p = resolveApp(path);
      accessSync(p, F_OK);
      return p;
    } catch (ex) {}
  }
  if (!options.required) {
    return null;
  }
  const dirName = paths.reduce((part, path) => {
    while (part !== path.substr(0, part.length)) {
      part = part.substr(0, part.length - 1);
    }
    return part;
  });

  console.log(
    chalk.red(
      'Could not find a required file, at least one of these file names must exist.',
    ),
  );
  paths.forEach(path => {
    console.log(
      chalk.red('  Name: ') + chalk.cyan(path.substr(dirName.length)),
    );
  });
  console.log(chalk.red('  Searched in: ') + chalk.cyan(dirName));
  process.exit(1);
  // Dead code kept for type checker:
  return null;
}

export const dotenv = resolveApp('.env');
export const appBuildDirectory = resolveApp('build');
export const appBuildDirectoryClient = resolveApp('build/public');

export const appSourceDirectory = resolveApp('src');
export const appPublicDirectory = resolveApp('src/public');
export const appHtml = resolveApp('src/public/index.html', {required: true});
export const appNodeModulesDirectory = resolveApp('node_modules');

export const appClient = firstExistingInApp(
  [
    'src/client.tsx',
    'src/client.ts',
    'src/client.jsx',
    'src/client.mjs',
    'src/client.js',
    'src/index.tsx',
    'src/index.ts',
    'src/index.jsx',
    'src/index.mjs',
    'src/index.js',
  ],
  {required: true},
);
export const appServerDev = firstExistingInApp(
  [
    'src/server.dev.tsx',
    'src/server.dev.ts',
    'src/server.dev.jsx',
    'src/server.dev.mjs',
    'src/server.dev.js',
    'src/server.tsx',
    'src/server.ts',
    'src/server.jsx',
    'src/server.mjs',
    'src/server.js',
  ],
  {required: true},
);

export const appServerProd = firstExistingInApp(
  [
    'src/server.prod.tsx',
    'src/server.prod.ts',
    'src/server.prod.jsx',
    'src/server.prod.mjs',
    'src/server.prod.js',
    'src/server.tsx',
    'src/server.ts',
    'src/server.jsx',
    'src/server.mjs',
    'src/server.js',
  ],
  {required: true},
);
export const appPackageJson = resolveApp('package.json', {required: true});
