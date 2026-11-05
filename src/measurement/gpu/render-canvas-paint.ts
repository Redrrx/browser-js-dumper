import type { CanvasCase } from './render-canvas-paths';
import { UnsupportedRenderFeature } from './render-suite-types';

const COMPOSITES: readonly GlobalCompositeOperation[] = [
  'source-over',
  'source-in',
  'source-out',
  'source-atop',
  'destination-over',
  'destination-in',
  'destination-out',
  'destination-atop',
  'lighter',
  'copy',
  'xor',
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
function stops(gradient: CanvasGradient) {
  gradient.addColorStop(0, '#eb436b');
  gradient.addColorStop(0.375, 'rgba(27,187,219,0.27)');
  gradient.addColorStop(0.376, '#ebd731');
  gradient.addColorStop(1, 'rgba(47,83,211,0.91)');
  return gradient;
}
function imageSource(ctx: CanvasRenderingContext2D, source: HTMLCanvasElement) {
  source.width = 8;
  source.height = 8;
  const target = source.getContext('2d');
  if (!target) throw new UnsupportedRenderFeature('Image-source Canvas2D unavailable');
  const pixels = ctx.createImageData(8, 8);
  for (let i = 0; i < 64; i++) {
    const x = i % 8;
    const y = Math.floor(i / 8);
    pixels.data.set([x * 31, y * 31, (x ^ y) * 31, 64 + ((x + y) % 4) * 63], i * 4);
  }
  target.putImageData(pixels, 0, 0);
}
function withImage(ctx: CanvasRenderingContext2D, draw: (image: HTMLCanvasElement) => void) {
  const source = document.createElement('canvas');
  try {
    imageSource(ctx, source);
    draw(source);
  } finally {
    source.width = 0;
    source.height = 0;
  }
}
function textScene(ctx: CanvasRenderingContext2D, font: string) {
  ctx.font = `19px ${font}`;
  ctx.fillText('AV fi Ω 0123', 7.25, 27.5);
  ctx.fillText('العربية', 7.5, 57.25);
  ctx.fillText('é Å 中', 7.75, 86.5);
  ctx.font = `italic bold 16px ${font}`;
  ctx.fillText('MW @ &', 7.5, 113.25);
}
export const CANVAS_PAINT_CASES: readonly CanvasCase[] = [
  {
    id: 'opaque_context',
    label: 'Opaque Canvas2D alpha compositing',
    settings: { alpha: false },
    draw(ctx) {
      ctx.fillStyle = 'rgba(229,61,107,0.37)';
      ctx.fillRect(8, 8, 77, 91);
      ctx.fillStyle = 'rgba(31,157,221,0.63)';
      ctx.fillRect(43, 39, 77, 81);
    },
  },
  {
    id: 'display_p3',
    label: 'Display P3 context, colors and sRGB readback',
    settings: { colorSpace: 'display-p3' },
    draw(ctx) {
      ctx.fillStyle = 'color(display-p3 1 0.2 0.1)';
      if (!ctx.fillStyle.includes('display-p3'))
        throw new UnsupportedRenderFeature('Display P3 colors unavailable');
      ctx.fillRect(5, 5, 83, 117);
      ctx.fillStyle = 'color(display-p3 0.1 1 0.2 / 0.63)';
      ctx.fillRect(43, 21, 79, 101);
    },
  },
  {
    id: 'linear_gradient',
    label: 'Linear gradient and near-coincident alpha stops',
    draw(ctx) {
      ctx.fillStyle = stops(ctx.createLinearGradient(7.25, 11.5, 117.75, 102.25));
      ctx.fillRect(4, 4, 120, 120);
    },
  },
  {
    id: 'radial_gradient',
    label: 'Off-center radial gradient',
    draw(ctx) {
      ctx.fillStyle = stops(ctx.createRadialGradient(37.5, 41.25, 3.5, 70.75, 76.5, 61.25));
      ctx.fillRect(4, 4, 120, 120);
    },
  },
  {
    id: 'conic_gradient',
    label: 'Conic gradient',
    draw(ctx) {
      if (typeof ctx.createConicGradient !== 'function')
        throw new UnsupportedRenderFeature('Conic gradients unavailable');
      ctx.fillStyle = stops(ctx.createConicGradient(0.31, 61.25, 64.75));
      ctx.fillRect(4, 4, 120, 120);
    },
  },
  {
    id: 'global_alpha',
    label: 'Overlapping fractional globalAlpha fills',
    draw(ctx) {
      for (const [i, alpha] of [0.125, 0.375, 0.5, 0.875].entries()) {
        ctx.globalAlpha = alpha;
        ctx.fillRect(8 + i * 21.25, 8 + i * 13.75, 47.5, 67.5);
      }
    },
  },
  ...[0, 7.5].map((blur) => ({
    id: `shadow_${String(blur).replace('.', '_')}`,
    label: `Shadow blur ${blur}`,
    draw(ctx: CanvasRenderingContext2D) {
      ctx.shadowColor = 'rgba(213,31,119,0.63)';
      ctx.shadowBlur = blur;
      ctx.shadowOffsetX = 9.25;
      ctx.shadowOffsetY = -5.5;
      ctx.beginPath();
      ctx.arc(57.25, 69.5, 35.75, 0, Math.PI * 2);
      ctx.fill();
    },
  })),
  ...COMPOSITES.map((operation) => ({
    id: `composite_${operation.replaceAll('-', '_')}`,
    label: `Compositing: ${operation}`,
    draw(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = 'rgba(229,61,107,0.71)';
      ctx.fillRect(9.25, 12.5, 76.5, 84.25);
      ctx.globalCompositeOperation = operation;
      if (ctx.globalCompositeOperation !== operation)
        throw new UnsupportedRenderFeature(`${operation} unavailable`);
      ctx.fillStyle = 'rgba(31,157,221,0.63)';
      ctx.beginPath();
      ctx.arc(79.5, 79.25, 41.75, 0, Math.PI * 2);
      ctx.fill();
    },
  })),
  ...(['repeat', 'repeat-x', 'repeat-y', 'no-repeat'] as const).map((repeat) => ({
    id: `pattern_${repeat.replaceAll('-', '_')}`,
    label: `Image pattern: ${repeat}`,
    draw(ctx: CanvasRenderingContext2D) {
      withImage(ctx, (source) => {
        const pattern = ctx.createPattern(source, repeat);
        if (!pattern) throw new UnsupportedRenderFeature('CanvasPattern unavailable');
        ctx.translate(9.25, 10.5);
        ctx.scale(3.75, 3.25);
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, 30, 32);
      });
    },
  })),
  {
    id: 'pattern_transform',
    label: 'CanvasPattern.setTransform',
    draw(ctx) {
      withImage(ctx, (source) => {
        const pattern = ctx.createPattern(source, 'repeat');
        if (
          !pattern ||
          typeof pattern.setTransform !== 'function' ||
          typeof DOMMatrix === 'undefined'
        )
          throw new UnsupportedRenderFeature('Pattern transform unavailable');
        pattern.setTransform(new DOMMatrix([3.5, 0.7, -0.4, 2.75, 11.25, 9.5]));
        ctx.fillStyle = pattern;
        ctx.fillRect(8, 8, 112, 112);
      });
    },
  },
  {
    id: 'image_nearest',
    label: 'drawImage nearest-neighbor enlargement',
    draw(ctx) {
      withImage(ctx, (source) => {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(source, 7.25, 10.5, 113.5, 105.75);
      });
    },
  },
  ...(['low', 'medium', 'high'] as const).map((quality) => ({
    id: `image_smooth_${quality}`,
    label: `drawImage smoothing: ${quality}`,
    draw(ctx: CanvasRenderingContext2D) {
      if (!('imageSmoothingQuality' in ctx))
        throw new UnsupportedRenderFeature('Smoothing quality unavailable');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = quality;
      if (ctx.imageSmoothingQuality !== quality)
        throw new UnsupportedRenderFeature(`${quality} smoothing unavailable`);
      withImage(ctx, (source) => {
        ctx.drawImage(source, 7.25, 10.5, 113.5, 105.75);
      });
    },
  })),
  {
    id: 'image_crop',
    label: 'drawImage fractional source crop and affine transform',
    draw(ctx) {
      withImage(ctx, (source) => {
        ctx.translate(64.25, 64.5);
        ctx.rotate(0.23);
        ctx.scale(-1, 1);
        ctx.drawImage(source, 1.25, 0.5, 5.5, 6.25, -45.5, -43.75, 91, 87.5);
      });
    },
  },
  {
    id: 'image_data',
    label: 'putImageData dirty rectangle (ignores transform/alpha)',
    draw(ctx) {
      const data = ctx.createImageData(64, 64);
      for (let i = 0; i < 4096; i++)
        data.data.set([i % 256, (i * 13) % 256, (i * 29) % 256, (i * 7) % 256], i * 4);
      ctx.scale(2, 2);
      ctx.globalAlpha = 0.25;
      ctx.putImageData(data, 25, 21, 7, 5, 53, 51);
    },
  },
  ...['sans-serif', 'serif', 'monospace'].map((font) => ({
    id: `text_${font.replace('-', '_')}`,
    label: `Text shaping: ${font}`,
    draw(ctx: CanvasRenderingContext2D) {
      textScene(ctx, font);
    },
  })),
  {
    id: 'text_stroke',
    label: 'strokeText and constrained fillText width',
    draw(ctx) {
      ctx.font = 'bold 29px sans-serif';
      ctx.lineWidth = 0.75;
      ctx.strokeText('AV fi', 8.25, 43.5);
      ctx.fillText('Wide text sample', 8.5, 91.25, 108.5);
    },
  },
  {
    id: 'text_rtl',
    label: 'RTL direction, text alignment and baselines',
    draw(ctx) {
      ctx.font = '20px sans-serif';
      ctx.direction = 'rtl';
      ctx.textAlign = 'start';
      ctx.textBaseline = 'top';
      ctx.fillText('مرحبا AV', 118.25, 9.5);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Ågj', 64.25, 68.5);
      ctx.textBaseline = 'bottom';
      ctx.fillText('Ågj', 64.25, 119.5);
    },
  },
  ...(['none', 'normal'] as const).map((kerning) => ({
    id: `text_kerning_${kerning}`,
    label: `Font kerning: ${kerning}`,
    draw(ctx: CanvasRenderingContext2D) {
      if (!('fontKerning' in ctx)) throw new UnsupportedRenderFeature('fontKerning unavailable');
      ctx.fontKerning = kerning;
      if (ctx.fontKerning !== kerning)
        throw new UnsupportedRenderFeature(`${kerning} kerning unavailable`);
      ctx.font = '31px serif';
      ctx.fillText('AVATAR', 5.25, 48.5, 117);
      ctx.fillText('To WA', 5.25, 98.25);
    },
  })),
  ...['blur(2px)', 'grayscale(0.7) contrast(1.3)', 'drop-shadow(3px 5px 2px #f05)'].map(
    (filter, index) => ({
      id: `filter_${index}`,
      label: `Canvas filter: ${filter}`,
      draw(ctx: CanvasRenderingContext2D) {
        if (!('filter' in ctx)) throw new UnsupportedRenderFeature('Canvas filters unavailable');
        ctx.filter = filter;
        if (ctx.filter === 'none') throw new UnsupportedRenderFeature(`${filter} unavailable`);
        ctx.fillRect(25.25, 19.5, 67.5, 89.25);
      },
    }),
  ),
];
