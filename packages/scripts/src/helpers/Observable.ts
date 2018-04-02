export default class Observable<T> {
  private _handler: (onValue: (value: T) => void) => void | null;
  private readonly _subscribers = new Set<(value: T) => void>();
  constructor(handler: (onValue: (value: T) => void) => void) {
    this._handler = handler;
  }
  private _start() {
    if (this._handler) {
      this._handler(value => {
        this._subscribers.forEach(subscriber => {
          subscriber(value);
        });
      });
    }
  }
  subscribe(onValue: (value: T) => void) {
    const handler = (value: T) => onValue(value);
    this._subscribers.add(handler);
    this._start();
    return () => this._subscribers.delete(handler);
  }
  static merge<T>(...observables: Observable<T>[]): Observable<T[]> {
    return new Observable(onValue => {
      const values: T[] = observables.map(() => null as any);
      const hasValues: boolean[] = observables.map(() => false);
      observables.forEach((observable, i) => {
        observable.subscribe(value => {
          values[i] = value;
          hasValues[i] = true;
          if (hasValues.every(v => v)) {
            onValue(values);
          }
        });
      });
    });
  }
  static addTrigger<T, S>(
    observable: Observable<T>,
    trigger: Observable<S>,
  ): Observable<T> {
    let value: T = null as any;
    let hasValue = false;
    return new Observable(onValue => {
      observable.subscribe(v => {
        value = v;
        hasValue = true;
        onValue(v);
      });
      trigger.subscribe(() => {
        if (hasValue) {
          onValue(value);
        }
      });
    });
  }
}
