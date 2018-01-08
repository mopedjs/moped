import {fork} from 'child_process';
import * as webpack from 'webpack';
import HotStatsStream from './HotStatsStream';

interface Compilation {
  assets: {[name: string]: {existsAt: string}};
}

export interface Options {
  name?: string;
  env?: {[key: string]: string | void};
}
export default class StartServerPlugin implements webpack.Plugin {
  static hotEntry = require.resolve('../hot-entry');

  private running = false;
  private options: Options;
  private hotPlugin: webpack.HotModuleReplacementPlugin;

  constructor(options: Options = {}) {
    this.options = options;
    this.hotPlugin = new webpack.HotModuleReplacementPlugin();
  }

  apply(compiler: webpack.Compiler) {
    this.hotPlugin.apply(compiler);
    const stream = new HotStatsStream(compiler);
    compiler.plugin('after-emit', (compilation, callback) => {
      if (this.running) {
        return callback();
      } else {
        this.running = true;
        this.startServer(compilation, stream, callback);
      }
    });
  }

  private startServer(
    compilation: Compilation,
    stream: HotStatsStream,
    callback: () => any,
  ) {
    let name;
    const names = Object.keys(compilation.assets);
    if (this.options.name) {
      name = this.options.name;
      if (!compilation.assets[name]) {
        console.error(
          'Entry ' + name + ' not found. Try one of: ' + names.join(' '),
        );
      }
    } else {
      name = names[0];
      if (names.length > 1) {
        console.log(
          'More than one entry built, selected ' +
            name +
            '. All names: ' +
            names.join(' '),
        );
      }
    }
    const {existsAt} = compilation.assets[name];

    const env = {
      ...process.env,
      ...(this.options.env || {}),
    };
    Object.keys(env).forEach(key => {
      if (env[key] === undefined) {
        delete env[key];
      }
    });
    function start() {
      let restarted = false;
      let restart = () => {
        if (restarted) return;
        restarted = true;
        start();
      };
      const childProcess = fork(existsAt, [], {env});
      childProcess.on('exit', stream.subscribe(m => childProcess.send(m)));
      childProcess.on('message', message => {
        if (message === 'restart') {
          childProcess.once('exit', () => restart());
          childProcess.kill();
        }
        if (message === 'uncaughtException') {
          let exited = false;
          let unsubscribe: null | (() => void) = null;
          unsubscribe = stream.subscribe(m => {
            if (m.type === 'ok' && exited) {
              if (unsubscribe) unsubscribe();
              restart();
            }
          });
          childProcess.once('exit', () => (exited = true));
          childProcess.kill();
        }
      });
    }
    start();
    callback();
  }
}
