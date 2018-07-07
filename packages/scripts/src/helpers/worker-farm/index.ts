import createWorkerFarm = require('worker-farm');

type WorkerType = (
  moduleName: string,
  methodName: string,
  args: any[],
  callback: (err: any, result?: any) => void,
) => void;
const workers: WorkerType = createWorkerFarm(
  // we have some really long running tasks, so lets have
  // each worker only handle one at a time
  {maxConcurrentCallsPerWorker: 1},
  require.resolve('./worker'),
);

export function end() {
  createWorkerFarm.end(workers as any);
}
export default function getModule<T, Key extends keyof T>(
  moduleName: string,
  methods: ReadonlyArray<Key>,
  module: () => Promise<T>,
): {[key in Key]: T[key]} {
  const result: any = {};
  methods.forEach(method => {
    result[method] = (...args: any[]) => {
      return new Promise((resolve, reject) => {
        workers(moduleName, method as string, args, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });
    };
  });
  return result;
}
