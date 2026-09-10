/** In-process FIFO mutex. Does not coordinate across DCL rooms or isolates. */
export function createAsyncMutex(): { run<T>(fn: () => Promise<T> | T): Promise<T> } {
  let tail: Promise<void> = Promise.resolve();
  return {
    run<T>(fn: () => Promise<T> | T): Promise<T> {
      const run = tail.then(fn, fn);
      tail = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  };
}
