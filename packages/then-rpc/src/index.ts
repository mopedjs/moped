import WorkerPool from './WorkerPool';

const WORKER_FILE = require.resolve('./worker-file');

export interface Options<
  TModule = any,
  TInitContext = void,
  TInitResult = TModule
> {
  filename: string;
  load?: () => Promise<TModule>;
  initContext?: TInitContext;
  init?: (
    mod: TModule,
    context: TInitContext,
  ) => Promise<TInitResult> | TInitResult;
  poolSize?: number;
}

export class TypedWorker<TModule, TInitContext = void, TInitResult = TModule> {
  private _pool: WorkerPool;
  constructor(options: Options<TModule, TInitContext, TInitResult>) {
    this._pool = new WorkerPool(WORKER_FILE, {
      args: [options.filename],
      async prepareWorker(worker) {
        if (options.init) {
          const {resolve, value} = await worker.run({
            kind: 'init',
            fn: options.init.toString(),
            context: options.initContext,
          });
          if (!resolve) {
            throw new Error(value.message);
          }
        }
      },
      poolSize: options.poolSize,
    });
  }
  async run<TContext, TResult>(
    context: TContext,
    fn: (mod: TInitResult, context: TContext) => Promise<TResult> | TResult,
  ): Promise<TResult> {
    const {resolve, value} = await this._pool.run({
      kind: 'run',
      fn: fn.toString(),
      context,
    });
    if (resolve) {
      return value;
    } else {
      throw new Error(value.message);
    }
  }
  setPoolSize(size: number) {
    return this._pool.setPoolSize(size);
  }
  dispose() {
    return this._pool.dispose();
  }
}

export class JestWorker<TModule, TInitContext = void, TInitResult = TModule> {
  private _worker: Promise<TInitResult>;
  constructor(options: Options<TModule, TInitContext, TInitResult>) {
    let mod: Promise<TModule> = options.load
      ? options.load()
      : import(options.filename);
    this._worker = mod.then(m => {
      return options.init ? options.init(m, options.initContext!) : (m as any);
    });
  }
  async run<TContext, TResult>(
    context: TContext,
    fn: (mod: TInitResult, context: TContext) => Promise<TResult> | TResult,
  ): Promise<TResult> {
    const worker = await this._worker;
    return Promise.resolve(
      new Function('mod,ctx', 'return (' + fn.toString() + ')(mod, ctx);')(
        worker,
        context,
      ),
    );
  }
  setPoolSize(size: number) {
    return Promise.resolve();
  }
  dispose() {
    return Promise.resolve();
  }
}

if (typeof jest !== 'undefined') {
  (TypedWorker as any) = JestWorker;
}

export default TypedWorker;
