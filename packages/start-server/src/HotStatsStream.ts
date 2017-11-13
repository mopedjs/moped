import * as webpack from 'webpack';

export interface StillOKMessage {
  type: 'still-ok';
}
export interface HashMessage {
  type: 'hash';
  data: string;
}
export interface ErrorsMessage {
  type: 'errors';
  data: any[];
}
export interface WarningsMessage {
  type: 'warnings';
  data: any[];
}
export interface OkMessage {
  type: 'ok';
}
export interface InvalidMessage {
  type: 'invalid';
}
export type Message =
  | StillOKMessage
  | HashMessage
  | ErrorsMessage
  | WarningsMessage
  | OkMessage
  | InvalidMessage;

interface JsonStats {
  errors?: any[];
  warnings?: any[];
  assets?: ({emitted: boolean})[];
  hash: string;
}

export default class Stream {
  private _handlers: Set<(message: Message) => {} | null | void> = new Set();
  private _stats: JsonStats | null;
  private _invalid: boolean = false;
  constructor(compiler: webpack.Compiler) {
    compiler.plugin('compile', () => {
      this._invalid = true;
      const handlers = Array.from(this._handlers);
      handlers.forEach(handler => handler({type: 'invalid'}));
    });
    compiler.plugin('invalid', () => {
      this._invalid = true;
      const handlers = Array.from(this._handlers);
      handlers.forEach(handler => handler({type: 'invalid'}));
    });
    compiler.plugin('done', (stats: webpack.Stats) => {
      const s = stats.toJson({errorDetails: false});
      this._stats = s;
      this._invalid = false;
      const handlers = Array.from(this._handlers);
      this._onStats(
        message => handlers.forEach(handler => handler(message)),
        s,
      );
    });
  }
  private _onStats(
    pushMessage: (message: Message) => {} | null | void,
    stats: JsonStats,
    force: boolean = false,
  ) {
    if (
      !force &&
      stats &&
      (!stats.errors || stats.errors.length === 0) &&
      stats.assets &&
      stats.assets.every(asset => !asset.emitted)
    ) {
      return pushMessage({type: 'still-ok'});
    }
    pushMessage({type: 'hash', data: stats.hash});
    if (stats.errors && stats.errors.length > 0) {
      pushMessage({type: 'errors', data: stats.errors});
    } else if (stats.warnings && stats.warnings.length > 0) {
      pushMessage({type: 'warnings', data: stats.warnings});
    } else {
      pushMessage({type: 'ok'});
    }
  }
  subscribe(handler: (message: Message) => {} | null | void): () => void {
    this._handlers.add(handler);
    if (this._invalid) {
      handler({type: 'invalid'});
    } else if (this._stats) {
      this._onStats(handler, this._stats, true);
    }
    return () => {
      this._handlers.delete(handler);
    };
  }
}
