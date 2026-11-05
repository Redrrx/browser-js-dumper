import { UnsupportedRenderFeature } from './render-suite-types';

type Draw = (ctx: CanvasRenderingContext2D) => void;
export interface CanvasCase {
  id: string;
  label: string;
  settings?: CanvasRenderingContext2DSettings;
  draw: Draw;
}
function path(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(15.25, 94.5);
  ctx.lineTo(51.5, 19.25);
  ctx.lineTo(79.75, 89.25);
  ctx.lineTo(112.5, 33.75);
}
function rings(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.rect(12.25, 12.5, 103.5, 103);
  ctx.rect(36.25, 36.5, 55.5, 55);
}
function stroke(label: string, configure: Draw): CanvasCase {
  return {
    id: label.replaceAll(/[ .]/g, '_'),
    label,
    draw(ctx) {
      ctx.lineWidth = 11;
      configure(ctx);
      path(ctx);
      ctx.stroke();
    },
  };
}
export const CANVAS_PATH_CASES: readonly CanvasCase[] = [
  {
    id: 'fill_rect',
    label: 'Integer and fractional fillRect',
    draw(ctx) {
      ctx.fillRect(8, 9, 40, 49);
      ctx.fillRect(61.125, 18.75, 47.5, 76.5);
    },
  },
  {
    id: 'stroke_rect',
    label: 'Fractional strokeRect',
    draw(ctx) {
      ctx.lineWidth = 1.5;
      ctx.strokeRect(9.25, 10.5, 109.5, 106.25);
      ctx.lineWidth = 5;
      ctx.strokeRect(33.5, 34.25, 59, 58.5);
    },
  },
  {
    id: 'clear_rect',
    label: 'clearRect with transform and alpha',
    draw(ctx) {
      ctx.fillRect(8, 8, 112, 112);
      ctx.translate(64, 64);
      ctx.rotate(0.31);
      ctx.clearRect(-32.5, -32.25, 65, 64.5);
    },
  },
  {
    id: 'polygon',
    label: 'Closed polygon fill and stroke',
    draw(ctx) {
      path(ctx);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    },
  },
  ...(['nonzero', 'evenodd'] as const).map((rule) => ({
    id: `fill_${rule}`,
    label: `Path winding: ${rule}`,
    draw(ctx: CanvasRenderingContext2D) {
      rings(ctx);
      ctx.fill(rule);
    },
  })),
  {
    id: 'quadratic',
    label: 'Quadratic Bézier curves',
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(8.5, 104.5);
      ctx.quadraticCurveTo(64.25, -29.5, 119.5, 104.5);
      ctx.quadraticCurveTo(64.25, 42.75, 8.5, 104.5);
      ctx.fill();
      ctx.stroke();
    },
  },
  {
    id: 'cubic',
    label: 'Cubic Bézier curves',
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(9.25, 64.5);
      ctx.bezierCurveTo(12.5, -31.25, 117.75, 159.5, 118.25, 24.5);
      ctx.lineWidth = 3.5;
      ctx.stroke();
    },
  },
  {
    id: 'arc',
    label: 'Circular arcs and opposite winding',
    draw(ctx) {
      ctx.beginPath();
      ctx.arc(64.25, 64.5, 48.75, 0.2, 5.8);
      ctx.arc(64.25, 64.5, 25.25, 5.8, 0.2, true);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    id: 'ellipse',
    label: 'Rotated ellipse',
    draw(ctx) {
      ctx.beginPath();
      ctx.ellipse(64.25, 64.5, 53.5, 23.25, 0.61, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    },
  },
  {
    id: 'arc_to',
    label: 'Tangent arcTo joins',
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(12, 110);
      ctx.arcTo(12, 12, 112, 12, 27.5);
      ctx.arcTo(112, 12, 112, 110, 38.25);
      ctx.lineTo(112, 110);
      ctx.stroke();
    },
  },
  {
    id: 'round_rect',
    label: 'roundRect with unequal elliptical corners',
    draw(ctx) {
      if (typeof ctx.roundRect !== 'function')
        throw new UnsupportedRenderFeature('roundRect unavailable');
      ctx.beginPath();
      ctx.roundRect(9.25, 14.5, 109.5, 99, [4, { x: 28, y: 14 }, 33, 11]);
      ctx.fill();
      ctx.stroke();
    },
  },
  {
    id: 'path2d',
    label: 'Path2D SVG parsing and transformed addPath',
    draw(ctx) {
      if (typeof Path2D === 'undefined' || typeof DOMMatrix === 'undefined')
        throw new UnsupportedRenderFeature('Path2D / DOMMatrix unavailable');
      const source = new Path2D('M8 45 Q32 -6 56 45 T104 45 L104 72 L8 72 Z');
      const combined = new Path2D();
      combined.addPath(source, new DOMMatrix([0.9, 0.2, -0.1, 0.9, 12, 18]));
      ctx.fill(combined);
      ctx.stroke(combined);
    },
  },
  ...(['butt', 'round', 'square'] as const).map((cap) =>
    stroke(`cap ${cap}`, (ctx) => {
      ctx.lineCap = cap;
    }),
  ),
  ...(['miter', 'round', 'bevel'] as const).map((join) =>
    stroke(`join ${join}`, (ctx) => {
      ctx.lineJoin = join;
    }),
  ),
  ...[1, 10].map((limit) =>
    stroke(`miter limit ${limit}`, (ctx) => {
      ctx.miterLimit = limit;
    }),
  ),
  ...[0.5, 1, 2, 5].map((width) =>
    stroke(`stroke width ${width}`, (ctx) => {
      ctx.lineWidth = width;
    }),
  ),
  ...[-7.25, 0, 7.25].map((offset) => ({
    ...stroke(`dash offset ${Math.abs(offset)}`, (ctx) => {
      ctx.lineWidth = 3.5;
      ctx.setLineDash([9.25, 3.5, 2]);
      ctx.lineDashOffset = offset;
    }),
    id: `dash_${String(offset).replace('-', 'negative_').replace('.', '_')}`,
    label: `Dashed stroke: offset ${offset}`,
  })),
  {
    id: 'subpixel_edges',
    label: 'Edges at eight fractional-pixel offsets',
    draw(ctx) {
      for (let i = 0; i < 8; i++) ctx.fillRect(7 + i * 15 + i / 8, 12.25, 5.5, 103.5);
    },
  },
  {
    id: 'line_angles',
    label: 'Thin lines at eight angles',
    draw(ctx) {
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 8;
        ctx.beginPath();
        ctx.moveTo(64 - Math.cos(angle) * 53, 64 - Math.sin(angle) * 53);
        ctx.lineTo(64 + Math.cos(angle) * 53, 64 + Math.sin(angle) * 53);
        ctx.stroke();
      }
    },
  },
  {
    id: 'affine_transform',
    label: 'Translation, rotation, shear and negative scale',
    draw(ctx) {
      ctx.translate(64.25, 63.75);
      ctx.rotate(0.37);
      ctx.transform(-0.9, 0.12, 0.31, 1.2, 0, 0);
      ctx.fillRect(-34.25, -22.5, 68.5, 45);
      ctx.strokeRect(-43.5, -31.25, 87, 62.5);
    },
  },
  ...(['nonzero', 'evenodd'] as const).map((rule) => ({
    id: `clip_${rule}`,
    label: `Clipping: ${rule}`,
    draw(ctx: CanvasRenderingContext2D) {
      rings(ctx);
      ctx.clip(rule);
      ctx.translate(64, 64);
      ctx.rotate(0.43);
      ctx.fillRect(-80, -24, 160, 48);
    },
  })),
  {
    id: 'save_restore',
    label: 'Nested save/restore with transformed clipping',
    draw(ctx) {
      ctx.save();
      ctx.translate(64, 64);
      ctx.rotate(0.35);
      ctx.beginPath();
      ctx.rect(-30, -40, 60, 80);
      ctx.clip();
      ctx.save();
      ctx.globalAlpha = 0.37;
      ctx.fillRect(-80, -80, 160, 160);
      ctx.restore();
      ctx.strokeRect(-20, -20, 40, 40);
      ctx.restore();
      ctx.fillRect(4, 4, 11, 11);
    },
  },
];
