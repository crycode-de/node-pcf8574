/**
 * Interface to describe a queued promise in a `PromiseQueue`.
 */
interface QueuedPromise<T = any> {
  promise: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

/**
 * A simple Promise Queue to allow the execution of some tasks in the correct order.
 *
 * (c) Peter Müller <peter@crycode.de>
 */
export class PromiseQueue {

  /**
   * Queued Promises.
   */
  private queue: QueuedPromise[] = [];

  /**
   * Indicator that we are working on a Promise.
   */
  private working: boolean = false;

  /**
   * Enqueue a Promise.
   * This adds the given Promise to the queue. If the queue was empty the Promise
   * will be started immediately.
   * @param promise Function which returns the Promise.
   * @returns A Promise which will be resolves (or rejected) if the queued promise is done.
   */
  public enqueue<T = void> (promise: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        promise,
        resolve,
        reject,
      });
      this.dequeue();
    });
  }

  /**
   * Returns if the queue is empty and no more Promises are queued.
   * @returns `true` if a Promise is active.
   */
  public isEmpty(): boolean {
    return !this.working && this.queue.length == 0;
  }

  /**
   * Get the first Promise of the queue and start it if there is no other
   * Promise currently active.
   * @returns `true` if Promise from the queue is started, `false` there is already an other active Promise or the queue is empty.
   */
  private dequeue (): boolean {
    if (this.working) {
      return false;
    }

    const item = this.queue.shift();
    if (!item) {
      return false;
    }

    try {
      this.working = true;
      item.promise()
        .then((value) => {
          item.resolve(value);
        })
        .catch((err) => {
          item.reject(err);
        })
        .finally(() => {
          this.working = false;
          this.dequeue()
        });

    } catch (err) {
      item.reject(err);
      this.working = false;
      this.dequeue();
    }

    return true;
  }
}
