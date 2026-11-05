import type { ProbeNavigator, ProbeWindow } from './types.js';

export const YIELD = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

export function read(obj: object, key: PropertyKey): unknown {
  return Reflect.get(obj, key) as unknown;
}
export function constructorName(value: object): unknown {
  const ctor = read(value, 'constructor');
  if (ctor == null) return undefined;
  return read(Object(ctor) as object, 'name');
}
export function objectDisplay(value: object): string {
  return '[' + (constructorName(value) ?? 'Object') + ']';
}
export function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) return String(read(error, 'message'));
  return String(error);
}
export function errorName(error: unknown): string {
  if (typeof error === 'object' && error !== null) return String(read(error, 'name') ?? 'error');
  return 'error';
}
export const probeNavigator = (): ProbeNavigator => navigator as unknown as ProbeNavigator;
export const probeWindow = (): ProbeWindow => window as ProbeWindow;
export function _glLose(gl: WebGLRenderingContext | WebGL2RenderingContext | null): void {
  if (!gl) return;
  try {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    // Context cleanup is best-effort; failure must not abort the remaining probes.
  }
}
