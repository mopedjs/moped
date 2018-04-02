/**
 * We share a single instance of the fork-ts-checker-webpack-plugin
 * that is shared between both the server and client build. This isn't
 * technically supported, but it seems to work well and it's way
 * faster than running typescript twice on the same code base for every
 * incremental build.
 */

import * as webpack from 'webpack';
import Observable from './Observable';

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

export enum LogLevel {
  info = 'info',
  warn = 'warn',
  error = 'error',
}
export class TypeScriptCheckerLogger extends Observable<undefined> {
  private _log: {level: LogLevel; args: any[]}[] = [];
  private _onLog: (value: undefined) => void = () => {};
  constructor() {
    super(onValue => (this._onLog = onValue));
  }
  clear() {
    this._log = [];
  }
  hasWarn() {
    return this._log.some(entry => entry.level === LogLevel.warn);
  }
  hasError() {
    return this._log.some(entry => entry.level === LogLevel.error);
  }
  print(level: LogLevel = LogLevel.info) {
    this._log.forEach(entry => {
      switch (entry.level) {
        case LogLevel.info:
          if (level === LogLevel.info) {
            console.info.apply(console, entry.args);
          }
          break;
        case LogLevel.warn:
          if (level === LogLevel.info || level === LogLevel.warn) {
            console.warn.apply(console, entry.args);
          }
          break;
        case LogLevel.error:
          console.error.apply(console, entry.args);
      }
    });
  }

  info(...args: any[]) {
    this._log.push({level: LogLevel.info, args});
    this._onLog(undefined);
  }
  warn(...args: any[]) {
    this._log.push({level: LogLevel.warn, args});
    this._onLog(undefined);
  }
  error(...args: any[]) {
    this._log.push({level: LogLevel.error, args});
    this._onLog(undefined);
  }
}

const loggerInstance = new TypeScriptCheckerLogger();

const checker: webpack.Plugin = new ForkTsCheckerWebpackPlugin({
  logger: loggerInstance,
  formatter: 'codeframe',
  checkSyntacticErrors: true,
});

export default checker;
export {loggerInstance as TypeScriptLog};
