import {
  CANVAS_W,
  CANVAS_H,
  CANVAS_TEXT_LAYERS,
  CANVAS_BLEND_MODES,
  CANVAS_MEASURE_FONTS,
  CANVAS_SAMPLE_POINTS,
  WEBGL_CONSTANT_RANGE,
} from './constants-graphics.js';
import { DATE_REF, DATE_REF_FORMATS, FONT_FAMILIES } from './constants-platform.js';
import { errorMessage, probeWindow, read, _glLose } from './utils.js';
import type { GLResult } from './types.js';
import type { Activator, ProbeRecord } from './types.js';
type GLContext = WebGLRenderingContext | WebGL2RenderingContext;

function recordGlParameter(ctx: GLContext, key: string, out: ProbeRecord): void {
  try {
    const value = read(ctx, key);
    if (typeof value !== 'number' || !Number.isInteger(value)) return;
    if (value <= WEBGL_CONSTANT_RANGE.min || value >= WEBGL_CONSTANT_RANGE.max) return;
    const parameter: unknown = ctx.getParameter(value);
    if (parameter == null) return;
    if (parameter instanceof Float32Array || parameter instanceof Int32Array) {
      out[key] = Array.from(parameter);
      return;
    }
    out[key] = parameter;
  } catch (e) {
    out[key + '.error'] = errorMessage(e);
  }
}

function walkGlParams(ctx: GLContext): ProbeRecord {
  const out: ProbeRecord = {};
  const seen = new Set<string>();
  let prototype = Object.getPrototypeOf(ctx);
  while (prototype && prototype !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(prototype)) {
      if (seen.has(key)) continue;
      seen.add(key);
      recordGlParameter(ctx, key, out);
    }
    prototype = Object.getPrototypeOf(prototype);
  }
  return out;
}

export const coreActivators: Activator[] = [
  { ns: 'navigator', get: () => navigator },
  { ns: 'visualViewport', get: () => visualViewport },
  { ns: 'screen', get: () => screen },
  { ns: 'performance', get: () => performance },
  { ns: 'history', get: () => history },
  { ns: 'location', get: () => location },
  { ns: 'document', get: () => document },
  { ns: 'crypto', get: () => crypto },
  { ns: 'indexedDB', get: () => indexedDB },
  { ns: 'caches', get: () => caches },

  {
    ns: 'canvas',
    get: () => {
      const c = document.createElement('canvas');
      c.width = CANVAS_W;
      c.height = CANVAS_H;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('2d context unavailable');
      const W = CANVAS_W;
      const H = CANVAS_H;

      const rg = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W / 2);
      rg.addColorStop(0, '#1a1a2e');
      rg.addColorStop(0.5, '#16213e');
      rg.addColorStop(1, '#0f3460');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(W / 2, H / 2);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r1 = 60;
        const r2 = 90;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          Math.cos(a - 0.3) * r1,
          Math.sin(a - 0.3) * r1,
          Math.cos(a + 0.3) * r2,
          Math.sin(a + 0.3) * r2,
          Math.cos(a) * r2,
          Math.sin(a) * r2,
        );
        ctx.strokeStyle = `hsla(${(i / 12) * 360},90%,65%,0.8)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();

      const lg = ctx.createLinearGradient(0, 0, W, H);
      [
        'rgba(255,100,100,0.3)',
        'rgba(100,255,100,0.3)',
        'rgba(100,100,255,0.3)',
        'rgba(255,255,100,0.3)',
        'rgba(255,100,255,0.3)',
      ].forEach((col, i) => lg.addColorStop(i / 4, col));
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, W, H);

      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      for (let x = 0; x <= W; x += 2)
        ctx.lineTo(
          x,
          H / 2 +
            Math.sin((x / W) * Math.PI * 4) * 40 +
            Math.sin((x / W) * Math.PI * 7) * 15 +
            Math.cos((x / W) * Math.PI * 11) * 8,
        );
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(W * 0.25, H * 0.5, 40, 30, Math.PI / 6, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = 'rgba(255,200,50,0.8)';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      ctx.save();
      ctx.shadowColor = 'rgba(0,255,200,0.9)';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(W * 0.75, H * 0.5, 25, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,200,180,0.7)';
      ctx.fill();
      ctx.restore();

      CANVAS_TEXT_LAYERS.forEach(([f, t], i) => {
        ctx.font = f;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(t, 8, 18 + i * 16);
      });

      CANVAS_BLEND_MODES.forEach((mode, i) => {
        ctx.globalCompositeOperation = mode;
        ctx.fillStyle = `hsla(${i * 72},80%,60%,0.6)`;
        ctx.beginPath();
        ctx.arc(350 + i * 8, 100 + i * 6, 20, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';

      const result: {
        measureText: ProbeRecord;
        pixels: Record<string, string>;
        rowHash: number | null;
        pixelHash: number | null;
        context: CanvasRenderingContext2D | ProbeRecord;
      } = { measureText: {}, pixels: {}, rowHash: null, pixelHash: null, context: {} };

      for (const [font, text] of CANVAS_MEASURE_FONTS) {
        ctx.font = font;
        const m = ctx.measureText(text);
        const k = font.replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '');
        result.measureText[k] = {
          width: m.width,
          actualBoundingBoxAscent: m.actualBoundingBoxAscent,
          actualBoundingBoxDescent: m.actualBoundingBoxDescent,
          fontBoundingBoxAscent: m.fontBoundingBoxAscent ?? null,
          fontBoundingBoxDescent: m.fontBoundingBoxDescent ?? null,
        };
      }

      for (const [px, py] of CANVAS_SAMPLE_POINTS) {
        const d = ctx.getImageData(px, py, 1, 1).data;
        result.pixels[`x${px}_y${py}`] = `${d[0]},${d[1]},${d[2]},${d[3]}`;
      }

      const row = ctx.getImageData(0, Math.round(H / 2), W, 1).data;
      let rh = 0;
      for (let i = 0; i < row.length; i++) rh = (rh * 31 + row[i]!) >>> 0;
      result.rowHash = rh;

      let ph = 0;
      for (const v of Object.values(result.pixels))
        for (const n of v.split(',').map(Number)) ph = (ph * 31 + n) >>> 0;
      result.pixelHash = ph;

      result.context = ctx;
      return result;
    },
  },

  {
    ns: 'audio',
    get: async () => {
      const ac = new OfflineAudioContext(1, 44100, 44100);
      const osc = ac.createOscillator();
      const comp = ac.createDynamicsCompressor();
      osc.type = 'triangle';
      osc.frequency.value = 10000;
      osc.connect(comp);
      comp.connect(ac.destination);
      osc.start(0);
      const buf = await ac.startRendering();
      const data = buf.getChannelData(0);

      let sum = 0;
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < data.length; i++) {
        const v = data[i]!;
        sum += Math.abs(v);
        if (v < min) min = v;
        if (v > max) max = v;
      }
      let hash = 0;
      for (let i = 0; i < 4096; i++) hash = (hash * 31 + Math.round(data[i]! * 1e9)) >>> 0;

      return {
        sampleRate: buf.sampleRate,
        length: buf.length,
        numberOfChannels: buf.numberOfChannels,
        channelData: { sum, min, max, mean: sum / data.length, hash4096: hash },
        compressor: {
          threshold: comp.threshold.value,
          knee: comp.knee.value,
          ratio: comp.ratio.value,
          attack: comp.attack.value,
          release: comp.release.value,
        },
        context: {
          sampleRate: ac.sampleRate,
          length: ac.length,
          numberOfChannels: read(ac, 'numberOfChannels'),
          currentTime: ac.currentTime,
        },
      };
    },
  },

  {
    ns: 'webgl',
    get: () => {
      const c = document.createElement('canvas');
      const gl =
        c.getContext('webgl') ||
        (c.getContext('experimental-webgl') as WebGLRenderingContext | null);
      if (!gl) return { available: false };

      const result: GLResult = { available: true, params: {}, extensions: null };

      const enumExtension = (ctx: WebGLRenderingContext | WebGL2RenderingContext, name: string) => {
        try {
          const ext: unknown = ctx.getExtension(name);
          if (!ext) return null;
          const out: ProbeRecord = {};
          for (const k of Object.getOwnPropertyNames(Object.getPrototypeOf(ext)).concat(
            Object.getOwnPropertyNames(ext),
          )) {
            try {
              const v = read(Object(ext) as object, k);
              if (typeof v === 'function') continue;
              out[k] = v;
              if (v instanceof Float32Array || v instanceof Int32Array) out[k] = Array.from(v);
            } catch (e) {
              out[k + '.error'] = errorMessage(e);
            }
          }
          return out;
        } catch {
          return null;
        }
      };

      const precOf = (ctx: WebGLRenderingContext | WebGL2RenderingContext) => {
        const out: ProbeRecord = {};
        const stages = { vertex: ctx.VERTEX_SHADER, fragment: ctx.FRAGMENT_SHADER };
        const precs = {
          low_float: ctx.LOW_FLOAT,
          medium_float: ctx.MEDIUM_FLOAT,
          high_float: ctx.HIGH_FLOAT,
          low_int: ctx.LOW_INT,
          medium_int: ctx.MEDIUM_INT,
          high_int: ctx.HIGH_INT,
        };
        for (const [sn, st] of Object.entries(stages))
          for (const [pn, pc] of Object.entries(precs)) {
            try {
              const f = ctx.getShaderPrecisionFormat(st, pc);
              if (f)
                out[sn + '.' + pn] = '[' + f.rangeMin + ',' + f.rangeMax + '] p=' + f.precision;
            } catch (e) {
              out[sn + '.' + pn + '.error'] = errorMessage(e);
            }
          }
        return out;
      };

      try {
        result.extensions = gl.getSupportedExtensions();
      } catch (e) {
        result.extensionsError = errorMessage(e);
      }
      result.params = walkGlParams(gl);
      result.precision = precOf(gl);

      try {
        const dbgExt = gl.getExtension('WEBGL_debug_renderer_info');
        if (dbgExt) {
          result.unmaskedVendor = gl.getParameter(dbgExt.UNMASKED_VENDOR_WEBGL);
          result.unmaskedRenderer = gl.getParameter(dbgExt.UNMASKED_RENDERER_WEBGL);
        }
      } catch (e) {
        result.unmaskedRendererError = errorMessage(e);
      }

      if (result.extensions) {
        result.extensionData = {};
        for (const name of result.extensions) {
          const d = enumExtension(gl, name);
          if (d && Object.keys(d).length) result.extensionData![name] = d;
        }
      }

      const c2 = document.createElement('canvas');
      const gl2 = c2.getContext('webgl2');
      if (gl2) {
        result.webgl2 = { available: true, params: {}, extensions: null, extensionData: {} };
        try {
          result.webgl2.extensions = gl2.getSupportedExtensions();
        } catch (e) {
          result.webgl2.extensionsError = errorMessage(e);
        }
        result.webgl2.params = walkGlParams(gl2);
        result.webgl2.precision = precOf(gl2);
        if (result.webgl2.extensions) {
          for (const name of result.webgl2.extensions) {
            const d = enumExtension(gl2, name);
            if (d && Object.keys(d).length) result.webgl2.extensionData![name] = d;
          }
        }
        _glLose(gl2);
      }

      _glLose(gl);
      return result;
    },
  },

  {
    ns: 'storage',
    get: async () => {
      const out: ProbeRecord = {};
      try {
        const est = await navigator.storage.estimate();
        out.quota = est.quota;
        out.usage = est.usage;
        if ((est as StorageEstimate & { usageDetails?: unknown }).usageDetails)
          out.usageDetails = (est as StorageEstimate & { usageDetails?: unknown }).usageDetails;
      } catch (e) {
        out.estimateError = errorMessage(e);
      }
      out.persisted = await navigator.storage.persisted().catch(() => null);

      for (const [label, store] of [
        ['local', window.localStorage],
        ['session', window.sessionStorage],
      ] as [string, Storage][]) {
        try {
          out[label + 'StorageLength'] = store.length;
          out[label + 'StorageKeys'] = Object.keys(store).sort();
        } catch (e) {
          out[label + 'StorageError'] = errorMessage(e);
        }
      }

      try {
        if (typeof indexedDB.databases === 'function') {
          const dbs = await indexedDB.databases();
          out.indexedDBs = dbs.map((d) => d.name + ' (v' + d.version + ')').sort();
          out.indexedDBCount = dbs.length;
        } else {
          out.indexedDBs = 'databases() unsupported';
        }
      } catch (e) {
        out.indexedDBError = errorMessage(e);
      }

      try {
        if (window.cookieStore) {
          const cks = await window.cookieStore.getAll();
          out.cookieNames = cks.map((c) => c.name).sort();
          out.cookieCount = cks.length;
        }
      } catch (e) {
        out.cookieStoreError = errorMessage(e);
      }

      return out;
    },
  },

  {
    ns: 'fonts',
    get: async () => {
      const result: ProbeRecord & { families: string[] | null } = {
        method: null,
        count: 0,
        families: null,
        checks: null,
      };

      if (typeof probeWindow().queryLocalFonts === 'function') {
        try {
          const local = await probeWindow().queryLocalFonts!();
          const families = new Set(local.map((f) => f.family));
          result.method = 'queryLocalFonts';
          result.count = families.size;
          result.families = [...families].sort();
          result.raw = local.map((f) => ({
            family: f.family,
            style: f.style,
            fullName: f.fullName,
            postscriptName: f.postscriptName,
          }));
        } catch {
          result.method = 'queryLocalFonts_denied';
        }
      }

      if (!result.families) {
        const checks: ProbeRecord = {};
        const checkErrors: ProbeRecord = {};
        for (const f of FONT_FAMILIES)
          try {
            checks[f.replace(/\s/g, '_')] = document.fonts.check('16px ' + f);
          } catch (e) {
            checkErrors[f.replace(/\s/g, '_')] = errorMessage(e);
          }
        result.method = 'checklist';
        result.count = Object.values(checks).filter(Boolean).length;
        result.checks = checks;
        if (Object.keys(checkErrors).length) result.checkErrors = checkErrors;
      }

      result.documentFontsSize = document.fonts.size;
      return result;
    },
  },

  {
    ns: 'layout',
    get: () => {
      const el = document.createElement('div');
      el.style.cssText =
        'position:fixed;top:10px;left:10px;width:100px;height:50px;font:16px Arial;padding:4px;border:2px solid red';
      el.textContent = 'probe';
      document.body.appendChild(el);
      const br = el.getBoundingClientRect();
      const cr: Partial<DOMRect> = el.getClientRects()[0] || {};

      const p = document.createElement('p');
      p.style.cssText =
        'position:fixed;top:0;left:0;font:16px Arial;visibility:hidden;white-space:nowrap';
      p.textContent = 'Hello World sphinx of quartz';
      document.body.appendChild(p);
      const range = document.createRange();
      range.selectNodeContents(p);
      const rbr = range.getBoundingClientRect();
      const rcr: Partial<DOMRect> = range.getClientRects()[0] || {};

      document.body.removeChild(el);
      document.body.removeChild(p);

      return {
        element: {
          boundingClientRect: {
            top: br.top,
            left: br.left,
            width: br.width,
            height: br.height,
            right: br.right,
            bottom: br.bottom,
          },
          clientRect0: { top: cr.top, left: cr.left, width: cr.width, height: cr.height },
        },
        range: {
          boundingClientRect: {
            top: rbr.top,
            left: rbr.left,
            width: rbr.width,
            height: rbr.height,
          },
          clientRect0: { top: rcr.top, left: rcr.left, width: rcr.width, height: rcr.height },
        },
      };
    },
  },

  {
    ns: 'svg',
    get: () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden';
      svg.setAttribute('width', '600');
      svg.setAttribute('height', '200');

      const defs: [string, number, string][] = [
        ['Arial', 16, 'Hello SVG World'],
        ['serif', 14, 'Sphinx of black quartz'],
        ['monospace', 12, '0Oljl| 1IiLl'],
      ];
      const result: ProbeRecord = {};
      const txts = defs.map(([fam, sz, content]) => {
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', '10');
        t.setAttribute('y', '50');
        t.setAttribute('font-family', fam);
        t.setAttribute('font-size', String(sz));
        t.textContent = content;
        svg.appendChild(t);
        return { el: t, fam, sz };
      });
      document.body.appendChild(svg);

      for (const { el, fam, sz } of txts) {
        const bb = el.getBBox();
        const ext = el.getExtentOfChar(0);
        result[`${fam}_${sz}`] = {
          bbox: { x: bb.x, y: bb.y, width: bb.width, height: bb.height },
          computedTextLength: el.getComputedTextLength(),
          subStringLength_0_5: el.getSubStringLength(0, 5),
          extentOfChar0: { x: ext.x, y: ext.y, width: ext.width, height: ext.height },
        };
      }
      document.body.removeChild(svg);
      return result;
    },
  },

  {
    ns: 'intl',
    get: () => {
      const ref = new Date(DATE_REF);
      const result: {
        resolvedOptions: ProbeRecord;
        formats: ProbeRecord;
        numberFormats: ProbeRecord;
        collator: ProbeRecord;
        segmenter: ProbeRecord;
        listFormat: ProbeRecord;
        displayNames: ProbeRecord;
        supportedLocales?: string;
        supportedLocalesError?: string;
      } = {
        resolvedOptions: {},
        formats: {},
        numberFormats: {},
        collator: {},
        segmenter: {},
        listFormat: {},
        displayNames: {},
      };

      for (const fmt of [
        'DateTimeFormat',
        'NumberFormat',
        'Collator',
        'RelativeTimeFormat',
        'PluralRules',
        'Segmenter',
        'ListFormat',
      ] as const)
        try {
          const Constructor = read(Intl, fmt) as new () => { resolvedOptions: () => unknown };
          result.resolvedOptions[fmt] = new Constructor().resolvedOptions();
        } catch (e) {
          result.resolvedOptions[fmt + '.error'] = errorMessage(e);
        }

      for (const [opts, key] of DATE_REF_FORMATS)
        try {
          result.formats[key] = new Intl.DateTimeFormat(undefined, opts).format(ref);
        } catch (e) {
          result.formats[key + '.error'] = errorMessage(e);
        }

      try {
        result.numberFormats.default = new Intl.NumberFormat().format(1234567.89);
      } catch (e) {
        result.numberFormats.defaultError = errorMessage(e);
      }
      try {
        result.numberFormats.currency = new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: 'USD',
        }).format(99.99);
      } catch (e) {
        result.numberFormats.currencyError = errorMessage(e);
      }
      try {
        result.numberFormats.percent = new Intl.NumberFormat(undefined, {
          style: 'percent',
        }).format(0.4567);
      } catch (e) {
        result.numberFormats.percentError = errorMessage(e);
      }
      try {
        result.collator.compareAB = new Intl.Collator().compare('a', 'b');
      } catch (e) {
        result.collator.compareABError = errorMessage(e);
      }
      try {
        result.supportedLocales = Intl.DateTimeFormat.supportedLocalesOf([
          'en',
          'zh',
          'ar',
          'ja',
          'fr',
          'de',
        ]).join(', ');
      } catch (e) {
        result.supportedLocalesError = errorMessage(e);
      }

      try {
        const seg = new Intl.Segmenter(undefined, { granularity: 'word' });
        result.segmenter.words = [...seg.segment('Hello world test')]
          .filter((s) => s.isWordLike)
          .map((s) => s.segment);
        result.segmenter.grapheme_count = [
          ...new Intl.Segmenter().segment('e\u0301cafe\u0301'),
        ].length;
      } catch (e) {
        result.segmenter.error = errorMessage(e);
      }

      try {
        result.listFormat.conjunction = new Intl.ListFormat(undefined, {
          style: 'long',
          type: 'conjunction',
        }).format(['a', 'b', 'c']);
      } catch (e) {
        result.listFormat.conjunctionError = errorMessage(e);
      }
      try {
        result.listFormat.disjunction = new Intl.ListFormat(undefined, {
          style: 'long',
          type: 'disjunction',
        }).format(['a', 'b', 'c']);
      } catch (e) {
        result.listFormat.disjunctionError = errorMessage(e);
      }
      try {
        result.listFormat.unit_short = new Intl.ListFormat(undefined, {
          style: 'short',
          type: 'unit',
        }).format(['5km', '3min']);
      } catch (e) {
        result.listFormat.unit_shortError = errorMessage(e);
      }

      try {
        const dnLang = new Intl.DisplayNames(undefined, { type: 'language' });
        result.displayNames.en = dnLang.of('en');
        result.displayNames.zh = dnLang.of('zh');
        result.displayNames.ar = dnLang.of('ar');
      } catch (e) {
        result.displayNames.languageError = errorMessage(e);
      }
      try {
        const dnReg = new Intl.DisplayNames(undefined, { type: 'region' });
        result.displayNames.US = dnReg.of('US');
        result.displayNames.CN = dnReg.of('CN');
      } catch (e) {
        result.displayNames.regionError = errorMessage(e);
      }
      try {
        const dnCur = new Intl.DisplayNames(undefined, { type: 'currency' });
        result.displayNames.USD = dnCur.of('USD');
        result.displayNames.EUR = dnCur.of('EUR');
      } catch (e) {
        result.displayNames.currencyError = errorMessage(e);
      }

      return result;
    },
  },

  {
    ns: 'date',
    get: () => {
      const ref = new Date(DATE_REF);
      const now = new Date();
      return {
        timezoneOffset: now.getTimezoneOffset(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        toString_tz: now
          .toString()
          .replace(/^[^(]*/, '')
          .replace(/[()]/g, ''),
        toLocaleString: ref.toLocaleString(),
        toLocaleDateString: ref.toLocaleDateString(),
        toLocaleTimeString: ref.toLocaleTimeString(),
        refYear: ref.getFullYear(),
        refMonth: ref.getMonth(),
        refDay: ref.getDate(),
        refHours: ref.getHours(),
      };
    },
  },
];
