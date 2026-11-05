import {
  cosineSimilarity,
  DEFAULT_MODIFIERS,
  jaccardDifference,
  perceptualDifference,
  structuralSimilarity,
  validateModifiers,
} from './similarity';
import type { ComparisonModifiers } from './similarity';

export const SENSITIVITY = [0.1, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 255] as const;
export const COMPARISON_MODES = ['heatmap', 'pixelmatch', 'jaccard', 'cosine', 'SSIM'] as const;
export const MODES = [
  ...COMPARISON_MODES,
  'frequency',
  'edges',
  'stats',
  'channels',
  'subpixel',
  'AA',
] as const;
export type AnalysisMode = (typeof MODES)[number];
export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}
export interface Difference {
  width: number;
  height: number;
  deltas: Uint8Array;
  histogram: number[];
  metrics: Record<string, number>;
}
function validate(image: Pixels) {
  if (
    !Number.isSafeInteger(image.width) ||
    !Number.isSafeInteger(image.height) ||
    image.width < 1 ||
    image.height < 1 ||
    image.width * image.height > 16_777_216 ||
    image.data.length !== image.width * image.height * 4
  )
    throw new Error('Invalid or oversized RGBA image');
}
export function rawDifference(a: Pixels, b: Pixels): Difference {
  validate(a);
  validate(b);
  if (a.width !== b.width || a.height !== b.height)
    throw new Error(`Image dimensions differ: ${a.width}×${a.height} and ${b.width}×${b.height}`);
  const n = a.width * a.height;
  const deltas = new Uint8Array(n);
  const histogram = Array<number>(256).fill(0);
  const sums = [0, 0, 0, 0];
  const maxima = [0, 0, 0, 0];
  let sum = 0;
  let squares = 0;
  let changed = 0;
  let max = 0;
  let maxIndex = 0;
  for (let i = 0; i < n; i++) {
    let d = 0;
    for (let c = 0; c < 4; c++) {
      const dc = Math.abs(a.data[i * 4 + c]! - b.data[i * 4 + c]!);
      sums[c] = sums[c]! + dc;
      maxima[c] = Math.max(maxima[c]!, dc);
      d = Math.max(d, dc);
    }
    deltas[i] = d;
    histogram[d] = histogram[d]! + 1;
    sum += d;
    squares += d * d;
    if (d) changed++;
    if (d > max) {
      max = d;
      maxIndex = i;
    }
  }
  const mean = sum / n;
  const sigma = Math.sqrt(Math.max(0, squares / n - mean * mean));
  let entropy = 0;
  let third = 0;
  let fourth = 0;
  histogram.forEach((count, delta) => {
    if (!count) return;
    const p = count / n;
    entropy -= p * Math.log2(p);
    third += p * (delta - mean) ** 3;
    fourth += p * (delta - mean) ** 4;
  });
  let skew = 0;
  let excessKurtosis = 0;
  if (sigma) {
    skew = third / sigma ** 3;
    excessKurtosis = fourth / sigma ** 4 - 3;
  }
  const metrics: Record<string, number> = {
    pixels: n,
    changed_pixels: changed,
    affected_pct: (changed / n) * 100,
    max_delta: max,
    mean_delta: mean,
    sigma,
    entropy_bits: entropy,
    skew,
    excess_kurtosis: excessKurtosis,
    max_x: maxIndex % a.width,
    max_y: Math.floor(maxIndex / a.width),
  };
  ['r', 'g', 'b', 'alpha'].forEach((name, c) => {
    metrics[`${name}_mean_delta`] = sums[c]! / n;
    metrics[`${name}_max_delta`] = maxima[c]!;
  });
  metrics.identical_pct = (histogram[0]! / n) * 100;
  for (const [name, lo, hi] of [
    ['delta_1_2_pct', 1, 2],
    ['delta_3_8_pct', 3, 8],
    ['delta_9_32_pct', 9, 32],
    ['delta_33_plus_pct', 33, 255],
  ] as const) {
    metrics[name] =
      (histogram.slice(lo, hi + 1).reduce((total, count) => total + count, 0) / n) * 100;
  }
  return { width: a.width, height: a.height, deltas, histogram, metrics };
}
function gray(p: Pixels): Float64Array {
  return Float64Array.from(
    { length: p.width * p.height },
    (_, i) => p.data[i * 4]! * 0.299 + p.data[i * 4 + 1]! * 0.587 + p.data[i * 4 + 2]! * 0.114,
  );
}
function sobel(
  g: Float64Array,
  w: number,
  h: number,
): { magnitude: Float64Array; angle: Float64Array } {
  const magnitude = new Float64Array(w * h);
  const angle = new Float64Array(w * h);
  const at = (x: number, y: number) =>
    g[Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))]!;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx =
        -at(x - 1, y - 1) +
        at(x + 1, y - 1) -
        2 * at(x - 1, y) +
        2 * at(x + 1, y) -
        at(x - 1, y + 1) +
        at(x + 1, y + 1);
      const dy =
        -at(x - 1, y - 1) -
        2 * at(x, y - 1) -
        at(x + 1, y - 1) +
        at(x - 1, y + 1) +
        2 * at(x, y + 1) +
        at(x + 1, y + 1);
      magnitude[y * w + x] = Math.hypot(dx, dy);
      angle[y * w + x] = Math.atan2(dy, dx);
    }
  return { magnitude, angle };
}
function heat(value: number): [number, number, number] {
  const t = Math.min(1, Math.max(0, value));
  return [
    255 * Math.min(1, t * 2),
    255 * Math.max(0, 1 - Math.abs(t * 2 - 1)),
    255 * Math.max(0, 1 - t * 2),
  ];
}
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  for (let len = 2; len <= n; len *= 2) {
    const theta = (-2 * Math.PI) / len;
    for (let start = 0; start < n; start += len)
      for (let k = 0; k < len / 2; k++) {
        const c = Math.cos(theta * k);
        const s = Math.sin(theta * k);
        const i = start + k;
        const j = i + len / 2;
        const tr = re[j]! * c - im[j]! * s;
        const ti = re[j]! * s + im[j]! * c;
        re[j] = re[i]! - tr;
        im[j] = im[i]! - ti;
        re[i] = re[i]! + tr;
        im[i] = im[i]! + ti;
      }
  }
}
function spectrum(difference: Float64Array, width: number, height: number) {
  const w = 2 ** Math.ceil(Math.log2(width));
  const h = 2 ** Math.ceil(Math.log2(height));
  if (w * h > 4_194_304) throw new Error('Frequency view is limited to 4 million padded pixels');
  const real = new Float64Array(w * h);
  const imag = new Float64Array(w * h);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) real[y * w + x] = difference[y * width + x]!;
  for (let y = 0; y < h; y++)
    fft(real.subarray(y * w, (y + 1) * w), imag.subarray(y * w, (y + 1) * w));
  for (let x = 0; x < w; x++) {
    const r = new Float64Array(h);
    const i = new Float64Array(h);
    for (let y = 0; y < h; y++) {
      r[y] = real[y * w + x]!;
      i[y] = imag[y * w + x]!;
    }
    fft(r, i);
    for (let y = 0; y < h; y++) {
      real[y * w + x] = r[y]!;
      imag[y * w + x] = i[y]!;
    }
  }
  const values = new Float64Array(w * h);
  let max = 0;
  let power = 0;
  let dc = 0;
  let hf = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = real[y * w + x]! ** 2 + imag[y * w + x]! ** 2;
      power += p;
      if (x === 0 && y === 0) dc = p;
      if (Math.hypot(Math.min(x, w - x) / w, Math.min(y, h - y) / h) > 0.25) hf += p;
      const v = Math.log1p(Math.sqrt(p));
      max = Math.max(max, v);
      values[((y + Math.floor(h / 2)) % h) * w + ((x + Math.floor(w / 2)) % w)] = v;
    }
  let dcPowerPct = 0;
  let highFrequencyPowerPct = 0;
  if (power) {
    dcPowerPct = (dc / power) * 100;
    highFrequencyPowerPct = (hf / power) * 100;
  }
  return {
    width: w,
    height: h,
    values,
    max,
    metrics: {
      dc_power_pct: dcPowerPct,
      high_frequency_power_pct: highFrequencyPowerPct,
    },
  };
}
export interface AnalysisVisual extends Pixels {
  metrics: Record<string, number>;
}
function heatVisual(
  width: number,
  height: number,
  values: Float64Array,
  metrics: Record<string, number>,
): AnalysisVisual {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const v = values[i]!;
    if (v > 0) {
      const color = heat(v);
      for (let c = 0; c < 3; c++) data[i * 4 + c] = color[c]!;
    }
    data[i * 4 + 3] = 255;
  }
  return { width, height, data, metrics };
}

function frequencyVisual(
  a: Pixels,
  b: Pixels,
  sensitivity: number,
  metrics: Record<string, number>,
): AnalysisVisual {
  const weightedAbsoluteRGBError = Float64Array.from(
    { length: a.width * a.height },
    (_, i) =>
      Math.abs(a.data[i * 4]! - b.data[i * 4]!) * 0.299 +
      Math.abs(a.data[i * 4 + 1]! - b.data[i * 4 + 1]!) * 0.587 +
      Math.abs(a.data[i * 4 + 2]! - b.data[i * 4 + 2]!) * 0.114,
  );
  const s = spectrum(weightedAbsoluteRGBError, a.width, a.height);
  const values = Float64Array.from(s.values, (v) => {
    if (s.max) return ((v / s.max) * 8) / sensitivity;
    return 0;
  });
  Object.assign(metrics, s.metrics);
  return heatVisual(s.width, s.height, values, metrics);
}

function ssimVisual(
  a: Pixels,
  b: Pixels,
  sensitivity: number,
  metrics: Record<string, number>,
  modifiers: ComparisonModifiers,
): AnalysisVisual {
  const { mssim, ssim_map: map } = structuralSimilarity(a, b, modifiers);
  const values = new Float64Array(a.width * a.height);
  const window = modifiers.ssimWindow;
  let min = 1;
  let below = 0;
  for (const score of map.data) {
    min = Math.min(min, score);
    if (score < 0.99) below++;
  }
  for (let y = 0; y < a.height; y++)
    for (let x = 0; x < a.width; x++) {
      const score = map.data[Math.floor(y / window) * map.width + Math.floor(x / window)]!;
      values[y * a.width + x] = ((1 - score) * 255) / sensitivity;
    }
  Object.assign(metrics, {
    ssim_mean: mssim,
    ssim_min: min,
    blocks: map.data.length,
    blocks_below_099_pct: (below / map.data.length) * 100,
  });
  return heatVisual(a.width, a.height, values, metrics);
}

function edgeColor(current: boolean, imported: boolean): number[] {
  if (current && imported) return [255, 220, 40];
  if (current) return [255, 130, 35];
  return [35, 210, 255];
}

function edgeVisual(
  a: Pixels,
  b: Pixels,
  mode: 'edges' | 'AA',
  sensitivity: number,
  metrics: Record<string, number>,
): AnalysisVisual {
  const w = a.width;
  const h = a.height;
  const n = w * h;
  const ea = sobel(gray(a), w, h);
  const eb = sobel(gray(b), w, h);
  const values = new Float64Array(n);
  let rgb: Uint8ClampedArray | null = null;
  let onlyA = 0;
  let onlyB = 0;
  let both = 0;
  let sum = 0;
  let angle = 0;
  if (mode === 'AA') rgb = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const av = ea.magnitude[i]!;
    const bv = eb.magnitude[i]!;
    const d = Math.abs(av - bv);
    values[i] = d / sensitivity / 4;
    sum += d;
    const ac = av > 1;
    const bc = bv > 1;
    if (ac && bc) {
      both++;
      const ad = Math.abs(ea.angle[i]! - eb.angle[i]!);
      angle += Math.min(ad, 2 * Math.PI - ad);
    } else if (ac) onlyA++;
    else if (bc) onlyB++;
    if (rgb) {
      const c = edgeColor(ac, bc);
      const scale = Math.min(1, d / sensitivity / 4);
      for (let ch = 0; ch < 3; ch++) rgb[i * 4 + ch] = c[ch]! * scale;
      rgb[i * 4 + 3] = 255;
    }
  }
  let sharedAngleMean = 0;
  if (both) sharedAngleMean = angle / both;
  Object.assign(metrics, {
    edge_mean_delta: sum / n,
    current_only_edges: onlyA,
    imported_only_edges: onlyB,
    shared_edges: both,
    shared_angle_mean_radians: sharedAngleMean,
  });
  if (rgb) return { width: w, height: h, data: rgb, metrics };
  return heatVisual(w, h, values, metrics);
}

function channelVisual(
  a: Pixels,
  b: Pixels,
  mode: 'channels' | 'subpixel',
  sensitivity: number,
  metrics: Record<string, number>,
): AnalysisVisual {
  const n = a.width * a.height;
  const data = new Uint8ClampedArray(n * 4);
  let affected = 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = [0, 1, 2].map((c) => Math.abs(a.data[i * 4 + c]! - b.data[i * 4 + c]!));
    const max = Math.max(...d);
    if (max > 1) {
      affected++;
      sum += max;
    }
    let color = [35, 210, 255];
    let scale = 1;
    switch (mode) {
      case 'channels':
        color = d.map((v) => Math.min(255, (v * 255) / sensitivity));
        break;
      case 'subpixel':
        if (d[0]! > d[1]! && d[0]! > d[2]!) color = [255, 130, 35];
        scale = Math.min(1, max / sensitivity);
        break;
    }
    for (let ch = 0; ch < 3; ch++) data[i * 4 + ch] = color[ch]! * scale;
    data[i * 4 + 3] = 255;
  }
  let mean = 0;
  if (affected) mean = sum / affected;
  Object.assign(metrics, {
    rgb_pixels_over_1: affected,
    rgb_over_1_mean: mean,
  });
  return { width: a.width, height: a.height, data, metrics };
}

function statsVisual(raw: Difference, metrics: Record<string, number>): AnalysisVisual {
  const width = 256;
  const height = 128;
  const values = new Float64Array(width * height);
  const max = Math.max(...raw.histogram);
  for (let x = 0; x < 256; x++)
    for (let y = 0; y < height; y++)
      if (height - y <= (raw.histogram[x]! / max) * height) values[y * width + x] = 1;
  return heatVisual(width, height, values, metrics);
}

export function analyzePixels(
  a: Pixels,
  b: Pixels,
  mode: AnalysisMode,
  sensitivity: number,
  modifiers: ComparisonModifiers = DEFAULT_MODIFIERS,
): AnalysisVisual {
  if (!SENSITIVITY.some((step) => step === sensitivity)) throw new Error('Unsupported sensitivity');
  validateModifiers(modifiers);
  const raw = rawDifference(a, b);
  const metrics = { ...raw.metrics };
  if (mode === 'cosine') metrics.cosine_similarity = cosineSimilarity(a, b, modifiers);
  switch (mode) {
    case 'pixelmatch':
      return perceptualDifference(a, b, modifiers, metrics);
    case 'jaccard':
      return jaccardDifference(a, b, modifiers, metrics);
    case 'frequency':
      return frequencyVisual(a, b, sensitivity, metrics);
    case 'SSIM':
      return ssimVisual(a, b, sensitivity, metrics, modifiers);
    case 'edges':
    case 'AA':
      return edgeVisual(a, b, mode, sensitivity, metrics);
    case 'channels':
    case 'subpixel':
      return channelVisual(a, b, mode, sensitivity, metrics);
    case 'stats':
      return statsVisual(raw, metrics);
    default:
      return heatVisual(
        a.width,
        a.height,
        Float64Array.from(raw.deltas, (d) => d / sensitivity),
        metrics,
      );
  }
}
