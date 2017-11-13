import Hot, {HotModuleStatus} from './Hot';
import {Message} from './HotStatsStream';
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');

// __webpack_hash__ is the hash of the current compilation.
// It's a global variable injected by Webpack.
declare const __webpack_hash__: string;

export default class HotClient {
  private hot: Hot = (module as any).hot;

  /**
   * isValid is `false` if a compilation is in progress and the update
   * has not yet been applied
   */
  private _isValid: boolean = true;

  // Remember some state related to hot module replacement.
  private isFirstCompilation = true;
  private mostRecentCompilationHash: string | null = null;
  private _compileError: string | void = undefined;
  private _runtimeError: string | void = undefined;
  private continueOnError: boolean;

  constructor({continueOnError}: {continueOnError?: boolean} = {}) {
    this.continueOnError = continueOnError || false;
    process.on('uncaughtException', err => {
      console.error(err);
      if (!continueOnError) {
        (process.send as any)('uncaughtException');
      }
      this._runtimeError =
        err.stack || err.message || '' + err || 'Unknown error';
    });
  }

  write(message: Message): void {
    switch (message.type) {
      case 'hash':
        this._isValid = true;
        this.handleAvailableHash(message.data);
        break;
      case 'still-ok':
        this._isValid = true;
        this.handleSuccess();
        break;
      case 'ok':
        this.handleSuccess();
        break;
      case 'warnings':
        this.handleWarnings(message.data);
        break;
      case 'errors':
        this.handleErrors(message.data);
        break;
      case 'invalid':
        this._isValid = false;
        break;
      default:
        return message;
    }
  }
  isValid(): boolean {
    return this._isValid && !this.isUpdateAvailable();
  }
  compileError(): string | void {
    return this._compileError;
  }
  runtimeError(): string | void {
    return this._runtimeError;
  }

  // Is there a newer version of this code available?
  private isUpdateAvailable() {
    return this.mostRecentCompilationHash !== __webpack_hash__;
  }
  // Webpack disallows updates in other states.
  private canApplyUpdates(): boolean {
    return this.hot.status() === HotModuleStatus.idle;
  }

  // Successful compilation.
  private handleSuccess() {
    // TODO: clearOutdatedErrors();
    const isHotUpdate = !this.isFirstCompilation;
    this.isFirstCompilation = false;
    this._compileError = undefined;

    // Attempt to apply hot updates or reload.
    if (isHotUpdate) {
      this.tryApplyUpdates(function onHotUpdateSuccess() {
        // Only dismiss it when we're sure it's a hot update.
        // Otherwise it would flicker right before the reload.
        // TODO: stop showing errors from previous runs
      });
    }
  }

  // Compilation with warnings (e.g. ESLint).
  private handleWarnings(warnings: any) {
    // TODO: clearOutdatedErrors();

    const isHotUpdate = !this.isFirstCompilation;
    this.isFirstCompilation = false;
    this._compileError = undefined;

    // function printWarnings() {
    //   // Print warnings to the console.
    //   const formatted = formatWebpackMessages({
    //     warnings: warnings,
    //     errors: [],
    //   });

    //   for (var i = 0; i < formatted.warnings.length; i++) {
    //     if (i === 5) {
    //       console.warn(
    //         'There were more warnings in other files.\n' +
    //           'You can find a complete log in the terminal.',
    //       );
    //       break;
    //     }
    //     console.warn(formatted.warnings[i]);
    //   }
    // }

    // Attempt to apply hot updates or reload.
    if (isHotUpdate) {
      this.tryApplyUpdates(function onSuccessfulHotUpdate() {
        // Only print warnings if we aren't refreshing the page.
        // Otherwise they'll disappear right away anyway.
        // N.B. We don't actually print warnings because we would be printing them to the same terminal they are already in
        // printWarnings();
        // Only dismiss it when we're sure it's a hot update.
        // Otherwise it would flicker right before the reload.
        // TODO: stop showing errors from previous runs
      });
    } else {
      // Print initial warnings immediately.
      // N.B. We don't actually print warnings because we would be printing them to the same terminal they are already in
      // printWarnings();
    }
  }

  // Compilation with errors (e.g. syntax error or missing modules).
  private handleErrors(errors: any) {
    // TODO: clearOutdatedErrors();

    this.isFirstCompilation = false;

    // "Massage" webpack messages.
    var formatted = formatWebpackMessages({
      errors: errors,
      warnings: [],
    });

    if (!this.continueOnError) {
      (process.send as any)('uncaughtException');
    }
    // Only show the first error.
    this._compileError = formatted.errors[0] || 'Error compiling backend code';

    // Also log them to the console.

    // N.B. We don't actually print errors because we would be printing them to the same terminal they are already in
    // if (typeof console !== 'undefined' && typeof console.error === 'function') {
    //   for (var i = 0; i < formatted.errors.length; i++) {
    //     console.error(formatted.errors[i]);
    //   }
    // }

    // Do not attempt to reload now.
    // We will reload on next success instead.
  }

  // There is a newer version of the code available.
  private handleAvailableHash(hash: string) {
    // Update last known compilation hash.
    this.mostRecentCompilationHash = hash;
  }

  // Attempt to update code on the fly, fall back to a hard reload.
  private tryApplyUpdates(onHotUpdateSuccess?: () => void) {
    if (!this.isUpdateAvailable() || !this.canApplyUpdates()) {
      return;
    }

    // if there were any errors, we restart because we don't know what state the system is in.
    if (this._runtimeError || this._compileError) {
      this.onFailToApplyUpdates();
      return;
    }

    // https://webpack.github.io/docs/hot-module-replacement.html#check
    this.hot.check(/* autoApply */ true).then(
      (updatedModules: any) => {
        // if the update could not be applied, we restart
        // if there were any errors, we restart because we don't know what state the system is in.
        if (!updatedModules || this._runtimeError || this._compileError) {
          this.onFailToApplyUpdates();
          return;
        }
        this.handleApplyUpdates(onHotUpdateSuccess);
      },
      () => this.onFailToApplyUpdates(),
    );
  }

  private onFailToApplyUpdates() {
    // trigger a complete restart of the server
    (process.send as any)('restart');
  }

  private handleApplyUpdates(onHotUpdateSuccess?: () => void) {
    if (typeof onHotUpdateSuccess === 'function') {
      // Maybe we want to do something.
      onHotUpdateSuccess();
    }

    if (this.isUpdateAvailable()) {
      // While we were updating, there was a new update! Do it again.
      this.tryApplyUpdates();
    }
  }
}
