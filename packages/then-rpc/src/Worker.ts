import {fork, ChildProcess} from 'child_process';
import throat = require('throat');

export default class Worker {
  private readonly _process: ChildProcess;
  private _dead: boolean = false;
  private _running = 0;
  constructor(modulePath: string, args?: string[]) {
    this._process = fork(modulePath, args);
  }

  private _run = throat(1, (message: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      this._process.once('message', resolve);
      this._process.send(message);
    });
  });
  async run(message: any) {
    if (this._dead) {
      throw new Error('Cannot run message on worker that is already dead');
    }
    this._running++;
    try {
      return await this._run(message);
    } finally {
      this._running--;
      if (this._dead && this._running === 0) {
        this._process.kill();
      }
    }
  }

  kill() {
    this._dead = true;
    if (this._running === 0) {
      this._process.kill();
    }
  }
}
