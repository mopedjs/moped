const Queue = require('then-queue');
export class IQueue<TItem> {
  push(item: TItem): void {}
  pop(): Promise<TItem> {
    throw new Error('faked');
  }
  length: number;
}
(IQueue as any) = Queue;
export default IQueue;
