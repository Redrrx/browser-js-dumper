import { PERMISSION_NAMES, MEDIA_QUERIES, MATH_PROBES } from './constants-platform.js';
import { probeNavigator } from './utils.js';
import type { Activator, ProbeRecord } from './types.js';
export const mediaActivators: Activator[] = [
  {
    ns: 'speech',
    get: () => {
      const voices = speechSynthesis.getVoices();
      const byName: ProbeRecord = {};
      for (const v of voices)
        byName[v.name] = { lang: v.lang, localService: v.localService, default: v.default };
      return { count: voices.length, voices: byName };
    },
  },

  {
    ns: 'media',
    get: async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const counts = { audioinput: 0, audiooutput: 0, videoinput: 0 };
        for (const d of devices) if (d.kind in counts) counts[d.kind]++;
        return { total: devices.length, ...counts };
      } catch {
        return { available: false };
      }
    },
  },

  {
    ns: 'permissions',
    get: async () => {
      const result: ProbeRecord = {};
      for (const name of PERMISSION_NAMES) {
        try {
          result[name] = (
            await navigator.permissions.query({ name: name as PermissionName })
          ).state;
        } catch {
          result[name] = 'unsupported';
        }
      }
      return result;
    },
  },

  {
    ns: 'battery',
    get: async () => {
      try {
        const b = await probeNavigator().getBattery();
        return {
          charging: b.charging,
          level: b.level,
          chargingTime: b.chargingTime,
          dischargingTime: b.dischargingTime,
        };
      } catch {
        return { available: false };
      }
    },
  },

  {
    ns: 'media_queries',
    get: () => {
      const result: ProbeRecord = {};
      for (const [k, q] of Object.entries(MEDIA_QUERIES))
        try {
          result[k] = window.matchMedia(q).matches;
        } catch {
          result[k] = null;
        }
      return result;
    },
  },

  {
    ns: 'error_stack',
    get: () => {
      const e = new Error('probe');
      if (!e.stack) return { stack: null, stackLines: 0, hasAt: null };
      return {
        stack: e.stack,
        stackLines: e.stack.split('\n').length,
        hasAt: e.stack.includes(' at '),
      };
    },
  },

  {
    ns: 'math_precision',
    get: () => {
      const result: ProbeRecord = {};
      for (const [key, fn] of MATH_PROBES)
        try {
          result[key] = fn();
        } catch {
          result[key] = null;
        }
      return result;
    },
  },

  {
    ns: 'plugins',
    get: () => ({
      length: navigator.plugins.length,
      names: Array.from(navigator.plugins).map((p) => p.name),
      mimeTypes: Array.from(navigator.mimeTypes).map((m) => m.type),
    }),
  },
];
