#!/usr/bin/env node

import {readFileSync, writeFile} from 'fs';
import {resolve} from 'path';
import {prompt} from 'inquirer';
import {gt} from 'semver';
const getLatestVersionAsync = require('latest-version');
const spawn = require('react-dev-utils/crossSpawn');

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
function spawnSync(cmd: string, args: string[] = []) {
  const result = spawn.sync('node', args, {stdio: 'inherit'});
  if (result.signal) {
    if (result.signal === 'SIGKILL') {
      console.log(
        'The build failed because the process exited too early. ' +
          'This probably means the system ran out of memory or someone called ' +
          '`kill -9` on the process.',
      );
    } else if (result.signal === 'SIGTERM') {
      console.log(
        'The build failed because the process exited too early. ' +
          'Someone might have called `kill` or `killall`, or the system could ' +
          'be shutting down.',
      );
    }
  }
}

updateLatestVersion();

async function run() {
  const localVersion = getLocalVersion();
  const latestVersion = getLatestVersion();
  if (!process.env.CI && localVersion && gt(latestVersion, localVersion)) {
    const {answer} = await prompt({
      name: 'answer',
      type: 'confirm',
      message:
        'There is a newer version of moped available, would you like to update?',
      default: true,
    });
    if (answer) {
      spawnSync('yarn', ['add', '-D', 'moped']);
    }
  }
  // TODO: Handle case where there is a local dependency in package.json
  //       but it is not installed.

  // TODO: Handle case where there is no package.json but global version
  //       is out of date.

  // TODO: spawn this async so `updateLatestVersion` can make
  // use of this process
  spawnSync(
    'node',
    [
      localVersion
        ? resolve('node_modules/moped/lib/main.js')
        : require.resolve('./main.js'),
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
