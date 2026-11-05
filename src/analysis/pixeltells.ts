// Published PixelTells filtering formulas: https://github.com/Redrrx/PixelTells
// Reference revision: aaa48f153704432bb7d33fbeda8e625b5675493e.
export const PIXELTELLS_MODELS = ['AMD', 'NVIDIA', 'SwiftShader'] as const;
export const PIXELTELLS_CHANNELS = 128 * 128 * 3;
export type PixelTellsModel = (typeof PIXELTELLS_MODELS)[number];
type RGB = [number, number, number];
export type PixelTellsTexture = [RGB, RGB, RGB, RGB];

export interface PixelTellsScore {
  model: PixelTellsModel;
  matches: number;
}
export interface PixelTellsResult {
  scores: PixelTellsScore[];
  controls: number;
  verdict: PixelTellsModel | 'Unknown' | 'Ambiguous' | 'Invalid';
}

const floatBits = new DataView(new ArrayBuffer(4));

function roundEven(value: number): number {
  const lower = Math.floor(value);
  const fraction = value - lower;
  if (fraction > 0.5 || (fraction === 0.5 && lower % 2 !== 0)) return lower + 1;
  return lower;
}

function truncateHalf(value: number): number {
  floatBits.setFloat32(0, value);
  const exponent = ((floatBits.getUint32(0) >>> 23) & 255) - 127;
  const step = 2 ** Math.max(-24, exponent - 10);
  return Math.floor(value / step) * step;
}

export function predictPixelTells(
  texture: PixelTellsTexture,
  x: number,
  y: number,
): Record<PixelTellsModel, RGB> {
  const s = 2 * x - 127;
  const t = 2 * y - 127;
  const cross = (s * t + 128) >>> 8;
  const predicted: Record<PixelTellsModel, RGB> = {
    AMD: [0, 0, 0],
    NVIDIA: [0, 0, 0],
    SwiftShader: [0, 0, 0],
  };
  for (const channel of [0, 1, 2] as const) {
    const a = texture[0][channel];
    const b = texture[1][channel];
    const c = texture[2][channel];
    const d = texture[3][channel];
    const weighted = (256 - s) * (256 - t) * a + s * (256 - t) * b + (256 - s) * t * c + s * t * d;
    const amd = Math.fround(roundEven(weighted / 8) / (8192 * 255));
    predicted.AMD[channel] = roundEven(255 * truncateHalf(amd));
    predicted.SwiftShader[channel] = roundEven(
      Math.fround(255 * Math.fround((weighted / 256) * Math.fround(1 / 65280))),
    );
    const combined = (256 + cross - s - t) * a + (s - cross) * b + (t - cross) * c + cross * d;
    const nvidia = Math.fround(((257 * combined + 128) >>> 8) / 65535);
    predicted.NVIDIA[channel] = (255 * Math.floor(4096 * nvidia) + 2047) >>> 12;
  }
  return predicted;
}

function distinguishesModels(texture: PixelTellsTexture): boolean {
  const pairs = [
    ['AMD', 'NVIDIA'],
    ['AMD', 'SwiftShader'],
    ['NVIDIA', 'SwiftShader'],
  ] as const;
  const distinct = new Set<number>();
  for (let pixel = 0; pixel < 128 * 128; pixel++) {
    const predicted = predictPixelTells(texture, 64 + (pixel % 128), 64 + Math.floor(pixel / 128));
    pairs.forEach(([left, right], index) => {
      if (predicted[left].some((value, channel) => value !== predicted[right][channel]))
        distinct.add(index);
    });
    if (distinct.size === pairs.length) return true;
  }
  return false;
}

export function createPixelTellsTexture(): PixelTellsTexture {
  for (let attempt = 0; attempt < 256; attempt++) {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const texture: PixelTellsTexture = [
      [bytes[0]!, bytes[1]!, bytes[2]!],
      [bytes[3]!, bytes[4]!, bytes[5]!],
      [bytes[6]!, bytes[7]!, bytes[8]!],
      [bytes[9]!, bytes[10]!, bytes[11]!],
    ];
    if (distinguishesModels(texture)) return texture;
  }
  throw new Error('Could not generate distinguishable PixelTells predictions');
}

function invalidControlPixels(pixels: Uint8ClampedArray): number {
  let controls = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const inControl = (offset / 4) % 512 >= 256;
    const nonBlack = pixels[offset] !== 0 || pixels[offset + 1] !== 0 || pixels[offset + 2] !== 0;
    if (pixels[offset + 3] !== 255 || (inControl && nonBlack)) controls++;
  }
  return controls;
}

function matchingChannels(pixels: Uint8ClampedArray, offset: number, prediction: RGB): number {
  let matches = 0;
  for (const channel of [0, 1, 2] as const) {
    if (pixels[offset + channel] === prediction[channel]) matches++;
  }
  return matches;
}

export function comparePixelTells(
  texture: PixelTellsTexture,
  pixels: Uint8ClampedArray,
): PixelTellsResult {
  if (pixels.length !== 512 * 256 * 4) throw new Error('Invalid PixelTells readback size');
  const controls = invalidControlPixels(pixels);
  const scores = PIXELTELLS_MODELS.map((model) => ({ model, matches: 0 }));
  for (let pixel = 0; pixel < 128 * 128; pixel++) {
    const x = 64 + (pixel % 128);
    const y = 64 + Math.floor(pixel / 128);
    const predicted = predictPixelTells(texture, x, y);
    const offset = (y * 512 + x) * 4;
    for (const score of scores) {
      score.matches += matchingChannels(pixels, offset, predicted[score.model]);
    }
  }
  const exact = scores.filter((score) => score.matches === PIXELTELLS_CHANNELS);
  let verdict: PixelTellsResult['verdict'] = 'Unknown';
  if (controls > 0) verdict = 'Invalid';
  else if (exact.length > 1) verdict = 'Ambiguous';
  else if (exact[0]) verdict = exact[0].model;
  return { scores, controls, verdict };
}
