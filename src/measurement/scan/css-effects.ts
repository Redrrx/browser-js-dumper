import type { ProbeSetter } from './types.js';
export function _cssHashPixels(data: Uint8ClampedArray | Uint8Array) {
  let h = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    h ^= data[i]!;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function cssProbeEffects(set: ProbeSetter) {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 64;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    set('css_effects.available', false);
    return;
  }

  const key = (s: string) => s.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
  const hash = () => _cssHashPixels(ctx.getImageData(0, 0, 64, 64).data);
  const base = () => {
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, 64, 64);
    const g = ctx.createLinearGradient(0, 0, 64, 64);
    g.addColorStop(0, '#ff00aa');
    g.addColorStop(1, '#00aaff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText('Ag', 6, 42);
  };

  const FILTERS = [
    'blur(2px)',
    'contrast(180%)',
    'sepia(100%)',
    'hue-rotate(90deg)',
    'saturate(300%)',
    'invert(100%)',
    'brightness(150%)',
    'grayscale(100%)',
    'drop-shadow(2px 2px 2px #000)',
    'blur(1px) contrast(150%)',
  ];
  for (const f of FILTERS) {
    base();
    try {
      ctx.filter = f;
      ctx.drawImage(cv, 0, 0);
      set('css_effects.filter.' + key(f), hash());
    } catch {
      set('css_effects.filter.' + key(f), 'error');
    }
  }
  ctx.filter = 'none';

  try {
    ctx.clearRect(0, 0, 64, 64);
    const r = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    r.addColorStop(0, '#fff');
    r.addColorStop(0.5, '#f0a');
    r.addColorStop(1, '#005');
    ctx.fillStyle = r;
    ctx.fillRect(0, 0, 64, 64);
    set('css_effects.gradient.radial', hash());
  } catch {
    set('css_effects.gradient.radial', 'error');
  }
  if (typeof ctx.createConicGradient === 'function') {
    try {
      ctx.clearRect(0, 0, 64, 64);
      const c = ctx.createConicGradient(0.3, 32, 32);
      c.addColorStop(0, '#f00');
      c.addColorStop(0.5, '#0f0');
      c.addColorStop(1, '#00f');
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 64, 64);
      set('css_effects.gradient.conic', hash());
    } catch {
      set('css_effects.gradient.conic', 'error');
    }
  } else {
    set('css_effects.gradient.conic', 'unsupported');
  }

  const BLENDS: GlobalCompositeOperation[] = [
    'multiply',
    'screen',
    'overlay',
    'darken',
    'lighten',
    'color-dodge',
    'color-burn',
    'hard-light',
    'soft-light',
    'difference',
    'exclusion',
    'hue',
    'saturation',
    'color',
    'luminosity',
  ];
  for (const mode of BLENDS) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, 64, 64);
    ctx.fillStyle = '#e08020';
    ctx.fillRect(0, 0, 48, 48);
    try {
      ctx.globalCompositeOperation = mode;
      ctx.fillStyle = '#2060e0';
      ctx.beginPath();
      ctx.arc(40, 40, 22, 0, 7);
      ctx.fill();
      set('css_effects.blend.' + key(mode), hash());
    } catch {
      set('css_effects.blend.' + key(mode), 'error');
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}
