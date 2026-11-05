import { comparePixelTells, createPixelTellsTexture } from '../analysis/pixeltells';
import type { PixelTellsResult } from '../analysis/pixeltells';
import { nextFrame, Resources } from './gpu/resources';

export interface PixelTellsCapture {
  result: PixelTellsResult;
  preview: string;
}

export async function runPixelTells(signal: AbortSignal): Promise<PixelTellsCapture> {
  signal.throwIfAborted();
  const texture = createPixelTellsTexture();
  const resources = new Resources();
  const destination = document.createElement('canvas');
  destination.width = 512;
  destination.height = 256;
  destination.setAttribute('aria-hidden', 'true');
  destination.style.cssText = 'position:fixed;left:-10000px;top:0;pointer-events:none';
  try {
    document.body.append(destination);
    const source = resources.canvas();
    source.width = 2;
    source.height = 2;
    const sourceContext = source.getContext('2d', { willReadFrequently: true });
    if (!sourceContext) throw new Error('Canvas2D is unavailable');
    const input = sourceContext.createImageData(2, 2);
    input.data.set(texture.flatMap((color) => [...color, 255]));
    sourceContext.putImageData(input, 0, 0);

    const format = {
      alpha: false,
      colorSpace: 'srgb',
      colorType: 'unorm8',
      willReadFrequently: false,
    } as const;
    const context = destination.getContext('2d', format) as CanvasRenderingContext2D | null;
    const attributes = context?.getContextAttributes();
    if (
      !context ||
      !attributes ||
      Object.entries(format).some(
        ([key, value]) => attributes[key as keyof typeof attributes] !== value,
      )
    )
      throw new Error(
        'Required Canvas2D format is unavailable (opaque sRGB, unorm8, GPU-preferred)',
      );
    context.fillStyle = '#000';
    context.fillRect(0, 0, 512, 256);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'low';
    context.drawImage(source, 0, 0, 256, 256);
    await nextFrame();
    signal.throwIfAborted();
    await nextFrame();
    signal.throwIfAborted();
    const output = context.getImageData(0, 0, 512, 256);
    if (!(output.data instanceof Uint8ClampedArray) || output.colorSpace !== 'srgb')
      throw new Error('PixelTells requires an 8-bit sRGB readback');
    return {
      result: comparePixelTells(texture, output.data),
      preview: destination.toDataURL('image/png'),
    };
  } finally {
    destination.remove();
    destination.width = 0;
    destination.height = 0;
    resources.dispose();
  }
}
