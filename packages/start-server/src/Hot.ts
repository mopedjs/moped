export enum HotModuleStatus {
  idle = 'idle',
  check = 'check',
  prepare = 'prepare',
  ready = 'ready',
  dispose = 'dispose',
  apply = 'apply',
  abort = 'abort',
  fail = 'fail',
}
export default interface Hot {
  accept(path: string, fn: () => void): void;
  status(): HotModuleStatus;
  /**
   * Test all loaded modules for updates and, if updates exist, apply them.
   */
  check(autoApply?: boolean): Promise<any>;
}
