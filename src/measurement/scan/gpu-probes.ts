import { WASM_FEATURES } from './constants-graphics.js';
import { errorMessage, probeNavigator, read } from './utils.js';
import type { Activator, ProbeRecord } from './types.js';
export const gpuActivators: Activator[] = [
  {
    ns: 'webgpu',
    get: async () => {
      if (!probeNavigator().gpu) return { available: false };
      const r: ProbeRecord = { available: true };
      try {
        r.preferredCanvasFormat = probeNavigator().gpu!.getPreferredCanvasFormat();
      } catch (e) {
        r.formatError = errorMessage(e);
      }
      let adapter;
      try {
        adapter = await probeNavigator().gpu!.requestAdapter();
      } catch (e) {
        r.adapterError = errorMessage(e);
      }
      if (!adapter) {
        r.adapter = null;
        return r;
      }
      r.isFallbackAdapter = adapter.isFallbackAdapter ?? null;
      try {
        let info = adapter.info;
        if (!info && adapter.requestAdapterInfo) info = await adapter.requestAdapterInfo();
        if (info)
          r.info = {
            vendor: info.vendor,
            architecture: info.architecture,
            device: info.device,
            description: info.description,
          };
      } catch (e) {
        r.infoError = errorMessage(e);
      }
      try {
        r.features = [...adapter.features].sort();
      } catch (e) {
        r.featuresError = errorMessage(e);
      }
      try {
        const lim: Record<string, number> = {};
        const proto = Object.getPrototypeOf(adapter.limits);
        for (const k of Object.getOwnPropertyNames(proto)) {
          try {
            const v = read(adapter.limits, k);
            if (typeof v === 'number') lim[k] = v;
          } catch (e) {
            r['limits.' + k + '.error'] = errorMessage(e);
          }
        }
        r.limits = lim;
      } catch (e) {
        r.limitsError = errorMessage(e);
      }
      return r;
    },
  },
  {
    ns: 'wasm_exec',
    get: async () => {
      if (typeof WebAssembly === 'undefined') return { available: false };
      const r: ProbeRecord = { available: true };
      const bytes = new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 7, 1, 96, 2, 127, 127, 1, 127, 3, 2, 1, 0, 7, 7, 1, 3, 97,
        100, 100, 0, 0, 10, 9, 1, 7, 0, 32, 0, 32, 1, 106, 11,
      ]);
      try {
        r.validate = WebAssembly.validate(bytes);
        const mod = await WebAssembly.instantiate(bytes);
        const add = mod.instance.exports.add;
        if (typeof add !== 'function') throw new Error('wasm add export unavailable');
        const invoke = add as (a: number, b: number) => number;
        r.add_2_3 = invoke(2, 3);
        const t = performance.now();
        let s = 0;
        for (let i = 0; i < 200000; i++) s = invoke(s, 1);
        r.calls200k_ms = Math.round((performance.now() - t) * 100) / 100;
        r.result200k = s;
      } catch (e) {
        r.execError = errorMessage(e);
      }
      r.tiers = {
        compileStreaming: typeof WebAssembly.compileStreaming === 'function',
        instantiateStreaming: typeof WebAssembly.instantiateStreaming === 'function',
        Memory: typeof WebAssembly.Memory === 'function',
        Table: typeof WebAssembly.Table === 'function',
        Global: typeof WebAssembly.Global === 'function',
      };
      const features: Record<string, boolean> = {};
      r.features = features;
      for (const [name, b] of WASM_FEATURES)
        try {
          features[name] = WebAssembly.validate(new Uint8Array(b));
        } catch {
          features[name] = false;
        }
      return r;
    },
  },
];
