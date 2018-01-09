import {readFile, writeFile, readdir} from 'fs';
import {resolve} from 'path';
import mkdirp = require('mkdirp');
import rimraf = require('rimraf');
import Worker from 'then-rpc';
const prettier = require('prettier');

export default class FileSystem {
  private _prettierOptions: Promise<{[key: string]: any}>;
  private _directory: string;
  private _prettierWorker: Worker<any>;
  constructor(directory: string) {
    this._directory = directory;
    this._prettierOptions = prettier.resolveConfig(directory + '/index.tsx');
    this._prettierWorker = new Worker({
      filename: require.resolve('prettier'),
      poolSize: 4,
    });
  }
  dispose() {
    return this._prettierWorker.dispose();
  }
  resolve(filename: string) {
    return resolve(this._directory, filename.replace(/^\//, ''));
  }
  async writeFile(filename: string, src: string) {
    const prettierOptions = await this._prettierOptions;
    prettierOptions.parser = 'typescript';
    const formatted = await this._prettierWorker.run(
      [src, prettierOptions],
      (prettier, [src, prettierOptions]) => {
        return prettier.format(src, prettierOptions);
      },
    );
    const fullFileName = this.resolve(filename);
    await new Promise((resolve, reject) => {
      readFile(fullFileName, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
          return reject(err);
        }
        if (!err && data === formatted) {
          return resolve();
        }
        writeFile(fullFileName, formatted, err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }
  mkdirp(dirname: string) {
    return new Promise((resolve, reject) => {
      mkdirp(this.resolve(dirname), err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  rimraf(dirname: string) {
    return new Promise((resolve, reject) => {
      rimraf(this.resolve(dirname), err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  readDir(dirname: string) {
    return new Promise<string[]>((resolve, reject) => {
      readdir(this.resolve(dirname), (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  }
}
