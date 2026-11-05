import type { ScanMap } from './types.js';
import { objectDisplay, read, YIELD } from './utils.js';

const SKIP_KEYS = new Set(['prototype', '__proto__', 'constructor', 'caller', 'arguments']);
function collectKeys(obj: object): Set<string> {
  const stops = new Set<object>([Object.prototype, Function.prototype, EventTarget.prototype]);
  const keys = new Set<string>();
  let cur: object | null = obj;
  while (cur !== null && !stops.has(cur)) {
    for (const key of Reflect.ownKeys(cur)) {
      if (typeof key === 'string' && !SKIP_KEYS.has(key)) keys.add(key);
    }
    cur = Object.getPrototypeOf(cur) as object | null;
  }
  return keys;
}
export function naturalDisplay(val: unknown): string {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val === 'string') return val;
  if (typeof val === 'bigint') return String(val) + 'n';
  if (
    val instanceof Float32Array ||
    val instanceof Float64Array ||
    val instanceof Int32Array ||
    val instanceof Uint32Array ||
    val instanceof Int16Array ||
    val instanceof Uint8Array
  )
    return Array.from(val).join(', ');
  if (Array.isArray(val)) return val.join(', ');
  return String(val);
}
export async function walk(
  obj: unknown,
  ns: string,
  map: ScanMap,
  seen: WeakSet<object>,
  depth: number,
): Promise<void> {
  if (depth > 10 || obj === null || typeof obj !== 'object' || seen.has(obj)) return;
  seen.add(obj);
  for (const key of collectKeys(obj)) {
    const path = ns + '.' + key;
    let val: unknown;
    try {
      val = read(obj, key);
    } catch {
      map.set(path, { type: 'throws', display: '[throws]' });
      continue;
    }
    if (typeof val === 'function') {
      map.set(path, { type: 'function', display: '[fn]' });
      continue;
    }
    if (typeof val === 'object' && val !== null) {
      if (
        Array.isArray(val) &&
        val.length > 0 &&
        val.every((v: unknown) => v === null || (typeof v !== 'object' && typeof v !== 'function'))
      ) {
        seen.add(val);
        const sorted: unknown[] = [...val];
        sorted.sort((a, b) => {
          if (String(a) < String(b)) return -1;
          if (String(a) > String(b)) return 1;
          return 0;
        });
        map.set(path, { type: 'string', display: sorted.join(', ') });
        continue;
      }
      map.set(path, { type: 'object', display: objectDisplay(val) });
      await walk(val, path, map, seen, depth + 1);
      continue;
    }
    let type: string = typeof val;
    if (val === null) type = 'null';
    if (typeof val === 'number') {
      type = 'float';
      if (Number.isInteger(val)) type = 'integer';
    }
    map.set(path, { type, display: naturalDisplay(val) });
    if (map.size % 500 === 0) await YIELD();
  }
}
