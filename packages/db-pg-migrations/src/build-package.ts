// @public

import {relative, resolve, join, dirname} from 'path';
import {readdirSync, statSync, readFileSync, writeFileSync} from 'fs';
import chalk from 'chalk';
import getID from './getID';
const prettier = require('prettier');

export interface Options {
  migrationsDirectory: string;
  outputFile: string;
  mopedDbPgMigrationsName?: string;
}

function notNull<T>(array: (null | void | T)[]): T[] {
  return array.filter((v): v is T => v != null);
}

export default async function buildPackage(options: Options) {
  const migrationsDirectory = resolve(options.migrationsDirectory);
  const outputFile = resolve(options.outputFile);

  const prettierOptions = (await prettier.resolveConfig(outputFile)) || {};
  prettierOptions.parser = 'typescript';
  const writeFile = (filename: string, src: string) => {
    const formatted = prettier.format(src, prettierOptions);
    try {
      if (readFileSync(filename, 'utf8') === formatted) {
        return;
      }
    } catch (ex) {
      if (ex.code !== 'ENOENT') {
        throw ex;
      }
    }
    writeFileSync(filename, formatted);
  };

  const migrations = notNull<{
    index: number;
    fullPath: string;
    name: string;
    id: string;
  }>(
    readdirSync(migrationsDirectory).map(name => {
      const fullPath = join(migrationsDirectory, name);
      if (fullPath === outputFile) {
        return;
      }
      const stat = statSync(fullPath);
      if (!stat.isFile()) {
        return;
      }
      const match = /^(\d+)\-/.exec(name);
      if (!match) {
        return;
      }
      const index = parseInt(match[1], 10);
      const src = readFileSync(fullPath, 'utf8');
      const match2 = /^export const id[\s\r\n]*=[\s\r\n]*['"]([0-9a-zA-Z]*)['"](?:\;|$)/m.exec(
        src,
      );
      const id = match2 ? match2[1] : getID();
      if (!match2) {
        writeFile(
          fullPath,
          src +
            `\n\n// Do not edit this unique ID\n` +
            `export const id = '${id}';\n`,
        );
      }
      return {index, fullPath, name, id};
    }),
  ).sort((a, b) => a.index - b.index);
  migrations.forEach((migration, index, migrations) => {
    if (migration.index < 1) {
      throw new Error(
        'Migration IDs should start at 0. Please rename:\n\n' +
          ' ' +
          chalk.cyan(migration.name),
      );
    }
    if (migration.index > index + 1) {
      throw new Error(
        'There does not seem to be a migration with id ' +
          (index + 1) +
          '. ' +
          'Migrations should exist in a sequence incrementing ' +
          'exactly one number at a time. Please rename:\n\n' +
          ' ' +
          chalk.cyan(migration.name),
      );
    }
    if (migration.index < index + 1 && index > 0) {
      throw new Error(
        'There seem to be two migrations with id ' +
          migration.index +
          '. ' +
          "Each migration should have a unique id otherwise we can't " +
          'which order they should execute in. Please rename one of:\n\n' +
          ' - ' +
          chalk.cyan(migration.name) +
          '\n' +
          ' - ' +
          chalk.cyan(migrations[index - 1].name),
      );
    }
  });
  const output = `
    // auto generated by @moped/db-pg-migrations - do not edit by hand

    import migrations, {MigrationsPackage${
      migrations.length ? ', operation' : ''
    }} from '${options.mopedDbPgMigrationsName || '@moped/db-pg-migrations'}';

    export {MigrationsPackage};
    export default migrations(
      ${migrations
        .map(
          migration =>
            `{
              id: ${JSON.stringify(migration.id)},
              index: ${migration.index},
              name: ${JSON.stringify(migration.name)},
              operation: async () => operation(await import(${JSON.stringify(
                relative(dirname(outputFile), migration.fullPath)
                  .replace(/\\/g, '/')
                  .replace(/^([^\.])/, './$1')
                  .replace(/\.[^\.]+$/, ''),
              )})),
            },`,
        )
        .join('\n')}
    );
  `;
  writeFile(outputFile, output);
}
