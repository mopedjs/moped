import Queue from './Queue';

type Q = (q: Queue<Q>) => void;

const entries = new Map<string | number, Queue<Q>>();

function waitInQueue(key: string | number): Promise<Queue<Q>> {
  const queue = entries.get(key);
  if (queue) {
    return new Promise<Queue<Q>>(resolve => queue.push(resolve));
  } else {
    const queue = new Queue<Q>();
    entries.set(key, queue);
    return Promise.resolve(queue);
  }
}
export default async function lock<T>(
  key: string | number,
  fn: () => Promise<T>,
): Promise<T> {
  const queue = await waitInQueue(key);
  try {
    return await fn();
  } finally {
    if (queue.isEmpty()) {
      entries.delete(key);
    } else {
      const next = queue.shift();
      if (next) next(queue);
    }
  }
}
