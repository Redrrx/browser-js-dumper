import { createStore } from 'zustand/vanilla';
import type { PixelTellsResult } from '../analysis/pixeltells';
import { runPixelTells } from '../measurement/pixeltells';

export type VendorDetectionState =
  | { status: 'idle' | 'running'; result: null; preview: null; error: null }
  | { status: 'success' | 'invalid'; result: PixelTellsResult; preview: string; error: null }
  | { status: 'failed'; result: null; preview: null; error: string };

const IDLE = {
  status: 'idle',
  result: null,
  preview: null,
  error: null,
} satisfies VendorDetectionState;
export const vendorDetectionStore = createStore<VendorDetectionState>(() => IDLE);
let active: { controller: AbortController; done: Promise<void> } | null = null;

async function measure(controller: AbortController): Promise<void> {
  try {
    controller.signal.throwIfAborted();
    vendorDetectionStore.setState({ ...IDLE, status: 'running' }, true);
    const capture = await runPixelTells(controller.signal);
    controller.signal.throwIfAborted();
    let status: 'success' | 'invalid' = 'success';
    if (capture.result.controls > 0) status = 'invalid';
    vendorDetectionStore.setState({ status, ...capture, error: null }, true);
  } catch (cause) {
    if (controller.signal.aborted) {
      vendorDetectionStore.setState(IDLE, true);
      return;
    }
    let error = 'PixelTells test could not complete';
    if (cause instanceof Error) error = cause.message;
    vendorDetectionStore.setState({ status: 'failed', result: null, preview: null, error }, true);
  }
}

export function runVendorDetection(): Promise<void> {
  if (active) return active.done;
  const controller = new AbortController();
  const done = Promise.resolve()
    .then(() => measure(controller))
    .finally(() => {
      active = null;
    });
  active = { controller, done };
  return done;
}

export function waitForVendorDetection(): Promise<void> {
  return active?.done ?? Promise.resolve();
}

export function cancelVendorDetection(): void {
  active?.controller.abort();
}
