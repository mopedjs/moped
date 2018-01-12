import * as cp from 'child_process';
const s = require('react-dev-utils/crossSpawn');
interface SpawnType {
  async: typeof cp.spawn;
  sync: typeof cp.spawnSync;
}
const spawn: SpawnType = {
  async: s,
  sync: s.sync,
};

export function spawnAsync(cmd: string, args: string[] = []) {
  const stdout: Buffer[] = [];
  const result = spawn.async(cmd, args, {
    stdio: ['inherit', 'pipe', 'inherit'],
  });
  result.stdout.on('data', data =>
    stdout.push(typeof data === 'string' ? Buffer.from(data) : data),
  );
  return new Promise<string>((resolve, reject) => {
    result.on('error', err => reject);
    result.on('close', (code, signal) => {
      if (signal) {
        if (signal === 'SIGKILL') {
          console.error(
            'The build failed because the process exited too early. ' +
              'This probably means the system ran out of memory or someone called ' +
              '`kill -9` on the process.',
          );
        } else if (signal === 'SIGTERM') {
          console.error(
            'The build failed because the process exited too early. ' +
              'Someone might have called `kill` or `killall`, or the system could ' +
              'be shutting down.',
          );
        }
      }
      if (code !== 0) {
        reject(new Error('Child process exited with code: ' + code));
      } else if (signal === 'SIGKILL' || signal === 'SIGTERM') {
        reject(new Error('Child process exited with signal: ' + signal));
      }
      resolve(Buffer.concat(stdout).toString('utf8'));
    });
  });
}

export function spawnAsyncInherit(cmd: string, args: string[] = []) {
  const result = spawn.async(cmd, args, {
    stdio: 'inherit',
  });
  return new Promise<void>((resolve, reject) => {
    result.on('error', err => reject);
    result.on('close', (code, signal) => {
      if (signal) {
        if (signal === 'SIGKILL') {
          console.error(
            'The build failed because the process exited too early. ' +
              'This probably means the system ran out of memory or someone called ' +
              '`kill -9` on the process.',
          );
          process.exit(code || 1);
        } else if (signal === 'SIGTERM') {
          console.error(
            'The build failed because the process exited too early. ' +
              'Someone might have called `kill` or `killall`, or the system could ' +
              'be shutting down.',
          );
          process.exit(code || 1);
        }
      }
      if (code !== 0) {
        process.exit(code);
      } else {
        resolve();
      }
    });
  });
}

export function spawnSyncInherit(cmd: string, args: string[] = []) {
  const result = spawn.sync(cmd, args, {stdio: 'inherit'});
  if (result.signal) {
    if (result.signal === 'SIGKILL') {
      console.error(
        'The build failed because the process exited too early. ' +
          'This probably means the system ran out of memory or someone called ' +
          '`kill -9` on the process.',
      );
      process.exit(result.status || 1);
    } else if (result.signal === 'SIGTERM') {
      console.error(
        'The build failed because the process exited too early. ' +
          'Someone might have called `kill` or `killall`, or the system could ' +
          'be shutting down.',
      );
      process.exit(result.status || 1);
    }
  }
  if (result.status !== 0) {
    process.exit(result.status);
  }
}
