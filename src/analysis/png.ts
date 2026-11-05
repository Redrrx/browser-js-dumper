import type { Pixels } from './pixels';
import { MAX_PNG_DIMENSION, MAX_PNG_PIXELS, validatePNGHeader } from './png-header';

export async function decodePNG(source: string): Promise<Pixels> {
  const header = validatePNGHeader(source);
  const image = new Image();
  image.src = source;
  await image.decode();
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (
    !width ||
    !height ||
    width > MAX_PNG_DIMENSION ||
    height > MAX_PNG_DIMENSION ||
    width * height > MAX_PNG_PIXELS
  )
    throw new Error('Decoded PNG exceeds the dimension/pixel limit');
  if (width !== header.width || height !== header.height)
    throw new Error('Decoded PNG dimensions do not match IHDR');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' });
  if (!ctx) throw new Error('A detached 2D context is unavailable');
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, width, height).data;
  canvas.width = 0;
  canvas.height = 0;
  return { width, height, data };
}
export function visualPNG(pixels: Pixels): string {
  const canvas = document.createElement('canvas');
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('A detached 2D context is unavailable');
  const bytes = new Uint8ClampedArray(pixels.data.length);
  bytes.set(pixels.data);
  ctx.putImageData(new ImageData(bytes, pixels.width, pixels.height), 0, 0);
  const url = canvas.toDataURL('image/png');
  canvas.width = 0;
  canvas.height = 0;
  return url;
}
