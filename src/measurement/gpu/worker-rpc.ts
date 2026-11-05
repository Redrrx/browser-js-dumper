export function workerRequest<T>(
  create: () => Worker,
  payload: unknown,
  timeout: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let worker: Worker | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (error: Error | null, value?: T): void => {
      clearTimeout(timer);
      worker?.terminate();
      if (error) reject(error);
      else resolve(value as T);
    };
    try {
      worker = create();
      timer = setTimeout(() => finish(new Error('timeout')), timeout);
      worker.onmessage = (event: MessageEvent<T>) => finish(null, event.data);
      worker.onerror = (event) => {
        event.preventDefault();
        finish(new Error(event.message || 'worker error'));
      };
      worker.onmessageerror = () => finish(new Error('worker message decode error'));
      worker.postMessage(payload);
    } catch (error) {
      if (error instanceof Error) finish(error);
      else finish(new Error(String(error)));
    }
  });
}
