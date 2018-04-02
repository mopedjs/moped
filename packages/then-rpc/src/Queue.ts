const Queue: typeof IQueue = require('then-queue');
export declare class IQueue<TItem> {
  push(item: TItem): void;
  pop(): Promise<TItem>;
  length: number;
}
export default Queue;
