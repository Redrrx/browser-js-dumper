import { _cssHashPixels } from './css-effects.js';
import type { Activator, ProbeRecord } from './types.js';

type CanvasResult = ProbeRecord & {
  smoothing?: ProbeRecord;
  stroke?: ProbeRecord;
  text?: ProbeRecord;
};
type ContextOf = (w: number, h: number) => CanvasRenderingContext2D;

function createCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
const hash = (ctx: CanvasRenderingContext2D, w: number, h: number) =>
  _cssHashPixels(ctx.getImageData(0, 0, w, h).data);
const tryset = (obj: ProbeRecord, key: string, fn: () => unknown) => {
  try {
    obj[key] = fn();
  } catch {
    obj[key] = 'error';
  }
};

function probeSmoothing(result: CanvasResult, ctxOf: ContextOf): void {
  result.smoothing = {};
  tryset(result, '_sm', () => {
    const src = createCanvas(8, 8);
    const sc = src.getContext('2d')!;
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        if ((x + y) % 2) sc.fillStyle = '#fff';
        else sc.fillStyle = '#103080';
        sc.fillRect(x, y, 1, 1);
      }
    for (const q of ['low', 'medium', 'high'] as const) {
      const ctx = ctxOf(64, 64);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = q;
      ctx.drawImage(src, 0, 0, 64, 64);
      result.smoothing![q] = hash(ctx, 64, 64);
    }
    const nx = ctxOf(64, 64);
    nx.imageSmoothingEnabled = false;
    nx.drawImage(src, 0, 0, 64, 64);
    result.smoothing!.nearest = hash(nx, 64, 64);
    return 1;
  });
  delete result._sm;
}

function probeStrokes(result: CanvasResult, ctxOf: ContextOf): void {
  result.stroke = {};
  const drawStroke = (fn: (ctx: CanvasRenderingContext2D) => void) => {
    const ctx = ctxOf(64, 64);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 9;
    fn(ctx);
    return hash(ctx, 64, 64);
  };
  for (const cap of ['butt', 'round', 'square'] as const)
    tryset(result.stroke, 'cap_' + cap, () =>
      drawStroke((ctx) => {
        ctx.lineCap = cap;
        ctx.beginPath();
        ctx.moveTo(14, 32);
        ctx.lineTo(50, 32);
        ctx.stroke();
      }),
    );
  for (const join of ['miter', 'round', 'bevel'] as const)
    tryset(result.stroke, 'join_' + join, () =>
      drawStroke((ctx) => {
        ctx.lineJoin = join;
        ctx.beginPath();
        ctx.moveTo(12, 50);
        ctx.lineTo(32, 14);
        ctx.lineTo(52, 50);
        ctx.stroke();
      }),
    );
  tryset(result.stroke, 'miterlimit2', () =>
    drawStroke((ctx) => {
      ctx.lineJoin = 'miter';
      ctx.miterLimit = 2;
      ctx.beginPath();
      ctx.moveTo(12, 53);
      ctx.lineTo(32, 15);
      ctx.lineTo(52, 53);
      ctx.stroke();
    }),
  );
  tryset(result.stroke, 'dash', () =>
    drawStroke((ctx) => {
      ctx.setLineDash([7, 4, 2, 4]);
      ctx.lineDashOffset = 1.5;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(6, 32);
      ctx.lineTo(58, 32);
      ctx.stroke();
    }),
  );
}

function probeShapes(result: CanvasResult, ctxOf: ContextOf): void {
  tryset(result, 'pattern_repeat', () => {
    const tile = createCanvas(6, 6);
    const tc = tile.getContext('2d')!;
    tc.fillStyle = '#e08020';
    tc.fillRect(0, 0, 3, 3);
    tc.fillStyle = '#2060e0';
    tc.fillRect(3, 3, 3, 3);
    const ctx = ctxOf(64, 64);
    ctx.fillStyle = ctx.createPattern(tile, 'repeat')!;
    ctx.fillRect(0, 0, 64, 64);
    return hash(ctx, 64, 64);
  });

  const star = (ctx: CanvasRenderingContext2D) => {
    const cx = 32;
    const cy = 32;
    const o = 28;
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k * 4 * Math.PI) / 5;
      if (k) ctx.lineTo(cx + Math.cos(a) * o, cy + Math.sin(a) * o);
      else ctx.moveTo(cx + Math.cos(a) * o, cy + Math.sin(a) * o);
    }
    ctx.closePath();
  };
  for (const rule of ['nonzero', 'evenodd'] as const)
    tryset(result, 'fillrule_' + rule, () => {
      const ctx = ctxOf(64, 64);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      star(ctx);
      ctx.fill(rule);
      return hash(ctx, 64, 64);
    });

  const rrCtx = ctxOf(64, 64);
  result.roundRect_supported = typeof rrCtx.roundRect === 'function';
  if (result.roundRect_supported)
    tryset(result, 'roundRect_hash', () => {
      rrCtx.fillStyle = '#fff';
      rrCtx.beginPath();
      rrCtx.roundRect(8, 8, 48, 48, [12, 4, 12, 4]);
      rrCtx.fill();
      return hash(rrCtx, 64, 64);
    });
}

function probeText(result: CanvasResult, ctxOf: ContextOf): void {
  result.text = {};
  const drawText = (fn: (ctx: CanvasRenderingContext2D) => void) => {
    const ctx = ctxOf(180, 48);
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.textBaseline = 'middle';
    fn(ctx);
    return hash(ctx, 180, 48);
  };
  tryset(result.text, 'arabic', () => drawText((ctx) => ctx.fillText('مرحبا بالعالم', 4, 24)));
  tryset(result.text, 'devanagari', () => drawText((ctx) => ctx.fillText('नमस्ते दुनिया', 4, 24)));
  tryset(result.text, 'rtl', () =>
    drawText((ctx) => {
      ctx.direction = 'rtl';
      ctx.fillText('abc مرحبا 123', 176, 24);
    }),
  );
  tryset(result.text, 'letterSpacing', () =>
    drawText((ctx) => {
      ctx.letterSpacing = '3px';
      ctx.fillText('AVWAToWA.', 4, 24);
    }),
  );
  tryset(result.text, 'kerning_none', () =>
    drawText((ctx) => {
      ctx.fontKerning = 'none';
      ctx.fillText('AVWAToWA.', 4, 24);
    }),
  );
  tryset(result.text, 'kerning_normal', () =>
    drawText((ctx) => {
      ctx.fontKerning = 'normal';
      ctx.fillText('AVWAToWA.', 4, 24);
    }),
  );
  tryset(result.text, 'metrics', () => {
    const ctx = ctxOf(8, 8);
    ctx.font = '32px sans-serif';
    const m = ctx.measureText('Ag誤y');
    return {
      width: m.width,
      actualBBoxAscent: m.actualBoundingBoxAscent,
      actualBBoxDescent: m.actualBoundingBoxDescent,
      actualBBoxLeft: m.actualBoundingBoxLeft,
      actualBBoxRight: m.actualBoundingBoxRight,
      fontBBoxAscent: m.fontBoundingBoxAscent ?? null,
      fontBBoxDescent: m.fontBoundingBoxDescent ?? null,
      alphabeticBaseline: m.alphabeticBaseline ?? null,
      hangingBaseline: m.hangingBaseline ?? null,
      ideographicBaseline: m.ideographicBaseline ?? null,
      emHeightAscent: (m as TextMetrics & { emHeightAscent?: number }).emHeightAscent ?? null,
      emHeightDescent: (m as TextMetrics & { emHeightDescent?: number }).emHeightDescent ?? null,
    };
  });
}

export const canvas2dActivator: Activator = {
  ns: 'canvas2d',
  get: () => {
    if (typeof CanvasRenderingContext2D === 'undefined') return { available: false };
    const result: CanvasResult = { available: true };
    const work = createCanvas(64, 64);
    const ctxOf: ContextOf = (w, h) => {
      work.width = w;
      work.height = h;
      const ctx = work.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('2d context unavailable');
      return ctx;
    };
    probeSmoothing(result, ctxOf);
    probeStrokes(result, ctxOf);
    probeShapes(result, ctxOf);
    probeText(result, ctxOf);
    return result;
  },
};
