import {existsSync} from 'fs';
import connect from '@moped/db-pg';
import sql from '@moped/sql';
import chalk from 'chalk';
import {spawn as nodeSpawn} from 'child_process';
const spawn: typeof nodeSpawn = require('cross-spawn');

function run(command: string, args?: string[], allowFailure: boolean = false) {
  return new Promise<string>((resolve, reject) => {
    const output: {kind: 'stdout' | 'stderr'; chunk: string | Buffer}[] = [];
    let result = '';
    const proc = spawn(command, args, {
      stdio: 'pipe',
    });
    proc.stdout.on('data', chunk => {
      output.push({kind: 'stdout', chunk});
      result += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    });
    proc.stderr.on('data', chunk => {
      output.push({kind: 'stderr', chunk});
    });
    proc.on('error', reject);
    proc.on('exit', code => {
      if (code === 0) {
        resolve(result);
      } else if (allowFailure) {
        reject(
          new Error(
            output
              .map(
                c =>
                  typeof c.chunk === 'string'
                    ? c.chunk
                    : c.chunk.toString('utf8'),
              )
              .join(''),
          ),
        );
      } else {
        output.forEach(c => process[c.kind].write(c.chunk));
        process.exit(code);
      }
    });
  });
}

async function isWorking(dbConnection: string): Promise<boolean> {
  const db = connect(dbConnection);
  // if we can connect to the database, it already exists :-)
  try {
    await db.query(sql`SELECT 1 + 1 AS solution`);
    db.dispose();
    return true;
  } catch (ex) {
    db.dispose();
    return false;
  }
}

export default async () => {
  const dbConnection = process.env.DATABASE_URL;
  if (!dbConnection) {
    console.warn(
      'You must set the DATABASE_URL envrionemnt variable in .env for moped to create the database.',
    );
    return;
  }
  if (await isWorking(dbConnection)) {
    return;
  }
  const match = /postgres\:\/\/([a-zA-Z0-9_\-]+)\@localhost\/([a-zA-Z0-9_\-]+)/.exec(
    dbConnection,
  );
  if (!match) {
    console.warn(
      'Unable to connect to the database: ' + chalk.cyan(dbConnection),
    );
    console.warn(
      'Moped can automatically create databeses where DATABASE_URL is of the form: ' +
        chalk.cyan('postgres://USERNAME@localhost/DBNAME'),
    );
    return;
  }
  const [, userName, dbName] = match;

  // if (process.platform !== 'darwin') {
  //   console.log(
  //     'You need to create the postgres database: ' + chalk.cyan(dbConnection),
  //   );
  //   return;
  // }

  let listing = '';
  let hasBrew = false;
  try {
    listing = await run('brew', ['list'], true);
    hasBrew = true;
  } catch (ex) {
    if (process.platform === 'darwin') {
      console.warn(
        'brew was not installed, so moped could not setup postgresql.',
      );
      console.warn('To install brew, run:');
      console.warn(
        '  ' +
          chalk.cyan(
            '/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"',
          ),
      );
      return;
    }
  }
  if (!/\bpostgresql\b/.test(listing) && hasBrew) {
    console.log('Installing postgresql...');
    await run('brew', ['install', 'postgresql']);
  }
  if (!existsSync('/usr/local/var/postgres')) {
    console.log('Initialising database...');
    try {
      await run('initdb', ['/usr/local/var/postgres', '-E', 'utf8']);
    } catch (ex) {
      if (ex.code !== 'ENOENT') {
        throw ex;
      }
      console.error(
        'Unable to find "initdb" command. Continuing anyway in case a postgres db was already created.',
      );
    }
  }
  if (hasBrew) {
    console.log('Starting postgresql service...');
    await run('brew', ['services', 'start', 'postgresql']);
  }
  try {
    console.log('Creating user...');
    await run('createuser', [userName], true);
  } catch (ex) {
    if (!/already exists/.test(ex.message)) {
      throw ex;
    }
  }
  try {
    console.log('Creating database...');
    await run('createdb', [dbName], true);
  } catch (ex) {
    if (!/already exists/.test(ex.message)) {
      throw ex;
    }
  }
  if (await isWorking(dbConnection)) {
    console.log('Database created :)');
    return;
  }
  console.warn('Failed to create the database ' + chalk.cyan(dbConnection));
};
