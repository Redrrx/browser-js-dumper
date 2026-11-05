import pixelmatch from 'pixelmatch';
import { distance, similarity } from 'ml-distance';
import { ssim } from 'ssim.js';
import type { AnalysisVisual, Pixels } from './pixels';

export const SSIM_WINDOWS = [4, 8, 16, 32] as const;
export interface ComparisonModifiers {
  pixelThreshold: number;
  includeAA: boolean;
  foregroundThreshold: number;
  ssimWindow: number;
  alpha: 'white' | 'black' | 'ignore';
}
export const DEFAULT_MODIFIERS: Readonly<ComparisonModifiers> = {
  pixelThreshold: 0.1,
  includeAA: true,
  foregroundThreshold: 128,
  ssimWindow: 8,
  alpha: 'white',
};

export function validateModifiers(options: ComparisonModifiers) {
  if (
    !Number.isFinite(options.pixelThreshold) ||
    options.pixelThreshold < 0 ||
    options.pixelThreshold > 1
  )
    throw new Error('Pixelmatch threshold must be between 0 and 1');
  if (
    !Number.isInteger(options.foregroundThreshold) ||
    options.foregroundThreshold < 0 ||
    options.foregroundThreshold > 255
  )
    throw new Error('Foreground cutoff must be an integer between 0 and 255');
  if (!SSIM_WINDOWS.some((size) => size === options.ssimWindow))
    throw new Error('Unsupported SSIM window size');
  if (!['white', 'black', 'ignore'].includes(options.alpha))
    throw new Error('Unsupported alpha handling');
  if (typeof options.includeAA !== 'boolean') throw new Error('Invalid anti-aliasing option');
}

function opaqueImage(image: Pixels, alpha: ComparisonModifiers['alpha']): Pixels {
  const data = new Uint8ClampedArray(image.data.length);
  let background = 0;
  if (alpha === 'white') background = 255;
  for (let i = 0; i < data.length; i += 4) {
    let opacity = image.data[i + 3]! / 255;
    if (alpha === 'ignore') opacity = 1;
    for (let c = 0; c < 3; c++)
      data[i + c] = image.data[i + c]! * opacity + background * (1 - opacity);
    data[i + 3] = 255;
  }
  return { width: image.width, height: image.height, data };
}

export function perceptualDifference(
  a: Pixels,
  b: Pixels,
  options: ComparisonModifiers,
  rawMetrics: Record<string, number>,
): AnalysisVisual {
  const data = new Uint8ClampedArray(a.data.length);
  const changed = pixelmatch(
    opaqueImage(a, options.alpha).data,
    opaqueImage(b, options.alpha).data,
    data,
    a.width,
    a.height,
    { threshold: options.pixelThreshold, includeAA: options.includeAA },
  );
  return {
    width: a.width,
    height: a.height,
    data,
    metrics: {
      ...rawMetrics,
      matched_pixels: a.width * a.height - changed,
      perceptual_changed_pixels: changed,
      perceptual_changed_pct: (changed / (a.width * a.height)) * 100,
    },
  };
}

function foreground(image: Pixels, cutoff: number): Uint8Array {
  return Uint8Array.from({ length: image.width * image.height }, (_, i) => {
    const luminance =
      0.299 * image.data[i * 4]! + 0.587 * image.data[i * 4 + 1]! + 0.114 * image.data[i * 4 + 2]!;
    return Number(luminance > cutoff);
  });
}

export function jaccardDifference(
  a: Pixels,
  b: Pixels,
  options: ComparisonModifiers,
  rawMetrics: Record<string, number>,
): AnalysisVisual {
  const ma = foreground(opaqueImage(a, options.alpha), options.foregroundThreshold);
  const mb = foreground(opaqueImage(b, options.alpha), options.foregroundThreshold);
  const data = new Uint8ClampedArray(a.data.length);
  let intersection = 0;
  let union = 0;
  for (let i = 0; i < ma.length; i++) {
    let color = [0, 0, 0];
    if (ma[i] || mb[i]) union++;
    if (ma[i] && mb[i]) {
      intersection++;
      color = [160, 160, 160];
    } else if (ma[i]) color = [255, 130, 35];
    else if (mb[i]) color = [35, 210, 255];
    for (let c = 0; c < 3; c++) data[i * 4 + c] = color[c]!;
    data[i * 4 + 3] = 255;
  }
  let score = 1;
  if (union) score = 1 - distance.jaccard(ma, mb);
  return {
    width: a.width,
    height: a.height,
    data,
    metrics: {
      ...rawMetrics,
      jaccard_similarity: score,
      foreground_intersection: intersection,
      foreground_union: union,
    },
  };
}

function rgbVector(image: Pixels): Uint8Array {
  const vector = new Uint8Array(image.width * image.height * 3);
  for (let i = 0; i < image.width * image.height; i++)
    for (let c = 0; c < 3; c++) vector[i * 3 + c] = image.data[i * 4 + c]!;
  return vector;
}

export function cosineSimilarity(a: Pixels, b: Pixels, options: ComparisonModifiers): number {
  const va = rgbVector(opaqueImage(a, options.alpha));
  const vb = rgbVector(opaqueImage(b, options.alpha));
  const aNonzero = va.some((value) => value !== 0);
  const bNonzero = vb.some((value) => value !== 0);
  if (!aNonzero && !bNonzero) return 1;
  if (!aNonzero || !bNonzero) return 0;
  return Math.max(0, Math.min(1, similarity.cosine(va, vb)));
}

export function structuralSimilarity(a: Pixels, b: Pixels, options: ComparisonModifiers) {
  return ssim(opaqueImage(a, options.alpha), opaqueImage(b, options.alpha), {
    ssim: 'bezkrovny',
    windowSize: options.ssimWindow,
    downsample: false,
    rgb2grayVersion: 'original',
    k1: 0.01,
    k2: 0.03,
  });
}
