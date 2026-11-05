import type { WorkerResult } from './timing-types';
const worker = globalThis as unknown as {
  onmessage: (() => void) | null;
  postMessage(value: WorkerResult): void;
};
worker.onmessage = () => {
  worker.postMessage({
    perf_now: performance.now(),
    date_now: Date.now(),
    has_perf: typeof performance !== 'undefined',
  });
};
