import type { ScanMap, Progress } from './scan/types.js';
import { coreActivators } from './scan/core.js';
import { mediaActivators } from './scan/media.js';
import { advancedActivators } from './scan/advanced.js';
import { integrityActivator } from './scan/integrity.js';
import { canvas2dActivator } from './scan/canvas2d.js';
import { gpuActivators } from './scan/gpu-probes.js';
import { cssProbeAll } from './scan/css-probe.js';
import { walk, naturalDisplay } from './scan/walker.js';
import { YIELD, objectDisplay, errorMessage } from './scan/utils.js';

export type { ScanEntry, ScanMap } from './scan/types.js';

const ACTIVATOR_TIMEOUT_MS = 5000;
function withTimeout(promise: Promise<unknown>, ms: number, ns: string): Promise<unknown> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout ' + ns + ' >' + ms + 'ms')), ms);
  });
  return Promise.race([promise, guard]).finally(() => clearTimeout(timer));
}

export async function scanAll(onProgress?: Progress): Promise<ScanMap> {
  const map: ScanMap = new Map();
  const seen = new WeakSet<object>();
  const winSeen = new WeakSet<object>();
  onProgress?.('window', 0);
  await walk(window, 'window', map, winSeen, 0);
  const activators = [
    ...coreActivators,
    ...mediaActivators,
    ...advancedActivators,
    integrityActivator,
    canvas2dActivator,
    ...gpuActivators,
  ];
  for (const { ns, get } of activators) {
    onProgress?.(ns, map.size);
    await YIELD();
    try {
      let obj = get();
      if (obj instanceof Promise) obj = await withTimeout(obj, ACTIVATOR_TIMEOUT_MS, ns);
      if (obj == null) continue;
      if (typeof obj === 'object') {
        map.set(ns, { type: 'object', display: objectDisplay(obj) });
        await walk(obj, ns, map, seen, 0);
      } else {
        map.set(ns, { type: typeof obj, display: naturalDisplay(obj) });
      }
    } catch (e) {
      map.set(ns, { type: 'throws', display: '[throws: ' + errorMessage(e) + ']' });
    }
  }
  await cssProbeAll(map, onProgress);
  return map;
}
