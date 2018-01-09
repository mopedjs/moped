import Worker from './Worker';
import Queue from './Queue';

export interface WorkerPoolOptions {
  args?: string[];
  poolSize?: number;
  prepareWorker?: (worker: Worker) => Promise<void>;
}
export default class WorkerPool {
  private readonly _filename: string;
  private readonly _args: string[];
  private readonly _workers = new Queue<Worker>();
  private readonly _prepareWorker: void | ((worker: Worker) => Promise<void>);
  private _poolSize: number = 0;

  constructor(filename: string, options: WorkerPoolOptions = {}) {
    this._filename = filename;
    this._args = options.args || [];
    const poolSize = options.poolSize !== undefined ? options.poolSize : 1;
    this.setPoolSize(poolSize);
  }

  async setPoolSize(desiredPoolSize: number) {
    let diff = desiredPoolSize - this._poolSize;
    this._poolSize = desiredPoolSize;
    while (diff > 0) {
      diff--;
      const w = new Worker(this._filename, this._args);
      if (this._prepareWorker) await this._prepareWorker(w);
      this._workers.push(w);
    }

    while (diff < 0) {
      diff++;
      const worker = await this._workers.pop();
      worker.kill();
    }
  }
  dispose() {
    return this.setPoolSize(0);
  }

  async getWorker(): Promise<{
    worker: Worker;
    dispose: () => void;
    claim: () => void;
  }> {
    const worker = await this._workers.pop();
    let claimed = false;
    let disposed = false;
    return {
      worker,
      dispose: () => {
        if (claimed) {
          throw new Error('Cannot dispose a claimed worker');
        }
        if (disposed) {
          throw new Error('Cannot dispose a worker multiple times');
        }
        disposed = true;
        this._workers.push(worker);
      },
      claim: () => {
        if (disposed) {
          throw new Error('Cannot claim a disposed worker');
        }
        if (claimed) {
          throw new Error('Cannot claim a worker multiple times');
        }
        claimed = true;
        this._poolSize--;
        this.setPoolSize(this._poolSize + 1);
      },
    };
  }

  async run(message: any): Promise<any> {
    const {worker, dispose} = await this.getWorker();
    try {
      return await worker.run(message);
    } finally {
      dispose();
    }
  }
}
