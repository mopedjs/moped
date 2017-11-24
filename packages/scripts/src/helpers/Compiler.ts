import * as webpack from 'webpack';
const chalk = require('chalk');
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');

export enum CompilerStatus {
  starting,
  invalid,
  done,
}
export default class Compiler {
  private _status: CompilerStatus = CompilerStatus.starting;
  private _name: string;
  private _stats: any;

  private _invalidSubscribers: Set<() => {} | null | void> = new Set();
  private _statusChangeSubscribers: Set<() => {} | null | void> = new Set();

  public readonly ready: Promise<{} | null | void>;
  constructor(
    config: webpack.Configuration,
    name: string,
    runner: (compiler: webpack.Compiler) => Promise<{} | null | void>,
  ) {
    this._name = name;
    // "Compiler" is a low-level interface to Webpack.
    // It lets us listen to some events and provide our own custom messages.
    let compiler;
    try {
      compiler = webpack(config);
    } catch (err) {
      console.log(chalk.red('Failed to compile ' + name));
      console.log();
      console.log(err.message || err);
      console.log();
      process.exit(1);
      return;
    }

    // "invalid" event fires when you have changed a file, and Webpack is
    // recompiling a bundle. WebpackDevServer takes care to pause serving the
    // bundle, so if you refresh, it'll wait instead of serving the old one.
    // "invalid" is short for "bundle invalidated", it doesn't imply any errors.
    compiler.plugin('invalid', () => {
      this._status = CompilerStatus.invalid;
      this._onInvalid();
      this._onStatusChange();
    });

    // "done" event fires when Webpack has finished recompiling the bundle.
    // Whether or not you have warnings or errors, you will get this event.
    compiler.plugin('done', stats => {
      this._status = CompilerStatus.done;
      this._stats = stats;
      this._onStatusChange();
    });
    this.ready = runner(compiler);
  }
  private _onStatusChange() {
    Array.from(this._statusChangeSubscribers).forEach(handler => handler());
  }
  private _onInvalid() {
    Array.from(this._invalidSubscribers).forEach(handler => handler());
  }
  onStatusChange(fn: () => {} | null | void) {
    this._statusChangeSubscribers.add(fn);
    return () => this._statusChangeSubscribers.delete(fn);
  }
  onInvalid(fn: () => {} | null | void) {
    this._invalidSubscribers.add(fn);
    return () => this._invalidSubscribers.delete(fn);
  }
  printStatus() {
    switch (this._status) {
      case CompilerStatus.starting:
      case CompilerStatus.invalid:
        console.log('Compiling ' + this._name + '...');
        return false;
      case CompilerStatus.done:
        const stats = this._stats;

        // We have switched off the default Webpack output in WebpackDevServer
        // options so we are going to "massage" the warnings and errors and present
        // them in a readable focused way.
        const messages = formatWebpackMessages(stats.toJson({}, true));
        const isSuccessful =
          !messages.errors.length && !messages.warnings.length;
        console.log('');
        if (isSuccessful) {
          console.log(chalk.green('Compiled ' + this._name + ' successfully!'));
        } else {
          console.log(chalk.red('Failed to compile ' + this._name));
          console.log('');
        }

        // If errors exist, only show errors.
        if (messages.errors.length) {
          console.log(chalk.red('Failed to compile.\n'));
          console.log(messages.errors.join('\n\n'));
          return;
        }

        // Show warnings if no errors were found.
        if (messages.warnings.length) {
          console.log(chalk.yellow('Compiled with warnings.\n'));
          console.log(messages.warnings.join('\n\n'));

          // Teach some ESLint tricks.
          console.log(
            '\nSearch for the ' +
              chalk.underline(chalk.yellow('keywords')) +
              ' to learn more about each warning.',
          );
          console.log(
            'To ignore, add ' +
              chalk.cyan('// eslint-disable-next-line') +
              ' to the line before.\n',
          );
        }
        return isSuccessful;
    }
  }
}
module.exports = Compiler;
