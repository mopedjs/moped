#!/usr/bin/env node

import {readFileSync, writeFile} from 'fs';
import {resolve} from 'path';
import {prompt} from 'inquirer';
import {gt} from 'semver';
import * as spawn from './helpers/spawn';
const getLatestVersionAsync = require('latest-version');

async function updateLatestVersion() {
  const version = await getLatestVersionAsync('moped');
  writeFile(__dirname + '/latest_version.txt', version, () => {
    // ignore errors
  });
}
function getLatestVersion() {
  try {
    return readFileSync(__dirname + '/latest_version.txt', 'utf8').trim();
  } catch (ex) {
    return require('../package.json').version;
  }
}
function getLocalVersion(): string | null {
  try {
    return JSON.parse(readFileSync('node_modules/moped/package.json', 'utf8'))
      .version;
  } catch (ex) {
    if (ex.code !== 'ENOENT') {
      throw ex;
    }
    return null;
  }
}
function hasDependency(): {
  hasPackageJSON: boolean;
  hasMoped: boolean;
  isDemo: boolean;
} {
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const version =
      (pkg.dependencies && pkg.dependencies.moped) ||
      (pkg.devDependencies && pkg.devDependencies.moped);
    return {
      hasPackageJSON: true,
      hasMoped: !!version,
      isDemo: pkg.name === 'generator-moped-output-demo',
    };
  } catch (ex) {
    if (ex.code !== 'ENOENT') {
      throw ex;
    }
    return {hasPackageJSON: false, hasMoped: false, isDemo: false};
  }
}

updateLatestVersion();

async function run() {
  const {hasPackageJSON, hasMoped, isDemo} = hasDependency();
  if (!hasPackageJSON) {
    if (process.env.CI) {
      console.error(
        'Missing package.json. If you want to set up a new project, run:\n\n' +
          '  yarn global add yo generator-moped\n' +
          '  yo moped',
      );
      process.exit(1);
    } else {
      const {answer} = await prompt({
        name: 'answer',
        type: 'confirm',
        message: 'Missing package.json. Do you want to set up a new project?',
        default: false,
      });
      if (answer) {
        await spawn.spawnAsyncInherit('yarn', [
          'global',
          'add',
          'yo',
          'generator-moped',
        ]);
        await spawn.spawnAsyncInherit('yo', ['moped']);
      } else {
        process.exit(1);
      }
    }
  } else if (!hasMoped) {
    if (process.env.CI) {
      console.error(
        'Moped does not appear to be a dependency. To add it, run:\n\n' +
          '  yarn add -D moped',
      );
      process.exit(1);
    } else {
      const {answer} = await prompt({
        name: 'answer',
        type: 'confirm',
        message:
          'Moped does not appear to be a dependency. Do you want to add it?',
        default: true,
      });
      if (answer) {
        await spawn.spawnAsyncInherit('yarn', ['add', '-D', 'moped']);
      } else {
        process.exit(1);
      }
    }
  } else if (!getLocalVersion() && !isDemo) {
    if (process.env.CI) {
      console.error(
        'Dependencies do not seem to be installed. To install them, run:\n\n' +
          '  yarn',
      );
      process.exit(1);
    } else {
      const {answer} = await prompt({
        name: 'answer',
        type: 'confirm',
        message:
          'Dependencies do not seem to be installed. Do you want to install them?',
        default: true,
      });
      if (answer) {
        await spawn.spawnAsyncInherit('yarn');
      } else {
        process.exit(1);
      }
    }
  }

  if (!isDemo) {
    const localVersion = getLocalVersion()!;
    const latestVersion = getLatestVersion();
    if (gt(latestVersion, localVersion)) {
      if (process.env.CI) {
        console.warn(
          'moped is out of date, running anyway because this is on CI.',
        );
      } else {
        const {answer} = await prompt({
          name: 'answer',
          type: 'confirm',
          message:
            'There is a newer version of moped available, would you like to update?',
          default: true,
        });
        if (answer) {
          await spawn.spawnAsyncInherit('yarn', ['add', '-D', 'moped']);
        }
      }
    }
  }

  await spawn.spawnAsyncInherit(
    'node',
    [
      isDemo
        ? require.resolve('./main')
        : resolve('node_modules/moped/lib/main.js'),
    ].concat(process.argv.slice(2)),
  );
}

run().then(
  () => {
    process.exit(0);
  },
  ex => {
    console.error(ex);
    process.exit(1);
  },
);
