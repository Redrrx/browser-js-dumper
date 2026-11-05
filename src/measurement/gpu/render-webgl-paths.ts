import { draw, QUAD, TRIANGLE } from './render-webgl-draw';
import type { WebGLCase } from './render-webgl-draw';
import { UnsupportedRenderFeature } from './render-suite-types';

function gradient(precision: string) {
  return `precision ${precision} float; varying vec2 uv;
void main(){gl_FragColor=vec4(uv.x,uv.y,uv.x*uv.y,1.0);}`;
}
const BLENDS = [
  ['straight_alpha', 'Straight-alpha blending', 'SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA'],
  ['premultiplied_alpha', 'Premultiplied-alpha blending', 'ONE', 'ONE_MINUS_SRC_ALPHA'],
  ['additive', 'Additive blending', 'ONE', 'ONE'],
  ['destination_alpha', 'Destination-alpha blending', 'DST_ALPHA', 'ONE_MINUS_DST_ALPHA'],
  ['constant_color', 'Constant-color blending', 'CONSTANT_COLOR', 'ONE_MINUS_CONSTANT_COLOR'],
] as const;
export const WEBGL_PATH_CASES: readonly WebGLCase[] = [
  {
    id: 'triangles',
    label: 'Fractional triangle coverage',
    draw(gl) {
      draw(gl, TRIANGLE);
    },
  },
  {
    id: 'triangle_strip',
    label: 'Triangle strip and shared edges',
    draw(gl) {
      draw(gl, [-0.9, -0.8, -0.8, 0.8, -0.1, -0.7, 0.1, 0.9, 0.8, -0.8, 0.9, 0.7], {
        mode: gl.TRIANGLE_STRIP,
      });
    },
  },
  {
    id: 'triangle_fan',
    label: 'Triangle fan',
    draw(gl) {
      draw(gl, [0.1, 0.2, -0.9, -0.7, 0.5, -0.9, 0.9, 0.4, -0.6, 0.9, -0.9, -0.7], {
        mode: gl.TRIANGLE_FAN,
      });
    },
  },
  {
    id: 'indexed',
    label: 'Indexed triangles (UNSIGNED_SHORT)',
    draw(gl) {
      draw(gl, [-0.8, -0.8, 0.8, -0.6, -0.6, 0.7, 0.9, 0.9], { indices: [0, 1, 2, 2, 1, 3] });
    },
  },
  {
    id: 'points',
    label: 'Point rasterization and gl_PointCoord',
    draw(gl) {
      const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array;
      if (range[1]! < 7) throw new UnsupportedRenderFeature('7px points unavailable');
      draw(gl, [-0.8, -0.75, -0.4, 0.1, 0.05, 0.7, 0.45, -0.2, 0.8, 0.55], {
        mode: gl.POINTS,
        fragment: 'precision mediump float; void main(){gl_FragColor=vec4(gl_PointCoord,0.7,1.0);}',
      });
    },
  },
  ...[1, 3].map((width) => ({
    id: `lines_${width}`,
    label: `Line rasterization: width ${width}`,
    draw(gl: Parameters<typeof draw>[0]) {
      const range = gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE) as Float32Array;
      if (range[1]! < width) throw new UnsupportedRenderFeature(`${width}px lines unavailable`);
      gl.lineWidth(width);
      draw(gl, [-0.9, -0.8, -0.6, 0.75, -0.2, -0.4, 0.3, 0.9, 0.8, -0.7], { mode: gl.LINE_STRIP });
    },
  })),
  {
    id: 'line_segments',
    label: 'Independent line segments (LINES)',
    draw(gl) {
      draw(gl, [-0.9, -0.8, 0.8, 0.7, -0.8, 0.7, 0.9, -0.6, -0.3, -0.9, 0.2, 0.9], {
        mode: gl.LINES,
      });
    },
  },
  {
    id: 'line_loop',
    label: 'Closed line loop',
    draw(gl) {
      draw(gl, TRIANGLE, { mode: gl.LINE_LOOP });
    },
  },
  {
    id: 'subpixel',
    label: 'Eight fractional-pixel edge positions',
    draw(gl) {
      for (let i = 0; i < 8; i++) {
        const x = (8 + i * 15 + i / 8) / 64 - 1;
        draw(gl, [
          x,
          -0.8,
          x + 5.5 / 64,
          -0.8,
          x,
          0.8,
          x,
          0.8,
          x + 5.5 / 64,
          -0.8,
          x + 5.5 / 64,
          0.8,
        ]);
      }
    },
  },
  {
    id: 'clip_space',
    label: 'Clip-space boundary clipping',
    draw(gl) {
      draw(gl, [-1.7, -0.6, 1.6, -1.4, 0.3, 1.8]);
    },
  },
  {
    id: 'perspective',
    label: 'Perspective-correct varying interpolation',
    draw(gl) {
      draw(gl, TRIANGLE, {
        vertex:
          'attribute vec2 p; varying vec2 uv; void main(){uv=p*0.5+0.5;float w=1.4+p.y*0.7;gl_Position=vec4(p,0.0,w);}',
        fragment: gradient('mediump'),
      });
    },
  },
  {
    id: 'viewport',
    label: 'Non-default viewport',
    draw(gl) {
      gl.viewport(13, 19, 91, 83);
      draw(gl, QUAD, { fragment: gradient('mediump') });
    },
  },
  {
    id: 'scissor',
    label: 'Scissor test and scissored clear',
    draw(gl) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(17, 23, 87, 79);
      gl.clearColor(0.8, 0.13, 0.27, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      draw(gl, TRIANGLE);
    },
  },
  {
    id: 'color_mask',
    label: 'Independent color-channel write masks',
    draw(gl) {
      draw(gl, QUAD, { color: [0.2, 0.4, 0.6, 1] });
      gl.colorMask(false, true, false, true);
      draw(gl, TRIANGLE, { color: [0.9, 0.8, 0.1, 0.5] });
    },
  },
  ...(['CW', 'CCW'] as const).map((winding) => ({
    id: `cull_${winding.toLowerCase()}`,
    label: `Face culling: ${winding}`,
    draw(gl: Parameters<typeof draw>[0]) {
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.frontFace(gl[winding]);
      draw(gl, [-0.9, -0.8, -0.1, -0.8, -0.5, 0.8, 0.1, -0.8, 0.5, 0.8, 0.9, -0.8]);
    },
  })),
  ...(['LESS', 'LEQUAL'] as const).map((func) => ({
    id: `depth_${func.toLowerCase()}`,
    label: `Depth test: ${func}`,
    draw(gl: Parameters<typeof draw>[0]) {
      if (!gl.getParameter(gl.DEPTH_BITS))
        throw new UnsupportedRenderFeature('Depth buffer unavailable');
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl[func]);
      draw(gl, QUAD, { depth: 0.2, color: [0.8, 0.2, 0.3, 1] });
      draw(gl, TRIANGLE, { depth: 0.2 });
      draw(gl, [-0.7, -0.7, 0.7, -0.7, 0.1, 0.1], { depth: -0.1, color: [0.3, 0.9, 0.2, 1] });
    },
  })),
  {
    id: 'depth_mask',
    label: 'Depth write mask',
    draw(gl) {
      if (!gl.getParameter(gl.DEPTH_BITS))
        throw new UnsupportedRenderFeature('Depth buffer unavailable');
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(false);
      draw(gl, QUAD, { depth: -0.4, color: [0.7, 0.2, 0.4, 1] });
      gl.depthMask(true);
      draw(gl, TRIANGLE, { depth: 0.4 });
    },
  },
  {
    id: 'polygon_offset',
    label: 'Coplanar depth and polygon offset',
    draw(gl) {
      if (!gl.getParameter(gl.DEPTH_BITS))
        throw new UnsupportedRenderFeature('Depth buffer unavailable');
      gl.enable(gl.DEPTH_TEST);
      draw(gl, QUAD, { color: [0.7, 0.2, 0.4, 1] });
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(-1, -1);
      draw(gl, TRIANGLE);
    },
  },
  {
    id: 'stencil',
    label: 'Stencil write, mask and equality test',
    draw(gl) {
      if (!gl.getParameter(gl.STENCIL_BITS))
        throw new UnsupportedRenderFeature('Stencil buffer unavailable');
      gl.enable(gl.STENCIL_TEST);
      gl.stencilFunc(gl.ALWAYS, 3, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
      gl.colorMask(false, false, false, false);
      draw(gl, TRIANGLE);
      gl.colorMask(true, true, true, true);
      gl.stencilMask(0);
      gl.stencilFunc(gl.EQUAL, 3, 0xff);
      draw(gl, QUAD, { fragment: gradient('mediump') });
    },
  },
  ...BLENDS.map(([id, label, source, destination]) => ({
    id: `blend_${id}`,
    label,
    draw(gl: Parameters<typeof draw>[0]) {
      draw(gl, QUAD, { color: [0.71, 0.13, 0.37, 0.6] });
      gl.enable(gl.BLEND);
      gl.blendColor(0.3, 0.6, 0.8, 0.5);
      gl.blendFunc(gl[source], gl[destination]);
      draw(gl, TRIANGLE, { color: [0.11, 0.37, 0.53, 0.6] });
    },
  })),
  {
    id: 'blend_separate',
    label: 'Separate RGB/alpha blend equations and factors',
    draw(gl) {
      draw(gl, QUAD, { color: [0.71, 0.13, 0.37, 0.6] });
      gl.enable(gl.BLEND);
      gl.blendEquationSeparate(gl.FUNC_REVERSE_SUBTRACT, gl.FUNC_ADD);
      gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      draw(gl, TRIANGLE);
    },
  },
  {
    id: 'blend_minmax',
    label: 'MIN / MAX blend equations',
    draw(gl) {
      const ext = gl.getExtension('EXT_blend_minmax');
      if (!ext) throw new UnsupportedRenderFeature('EXT_blend_minmax unavailable');
      draw(gl, QUAD, { color: [0.71, 0.13, 0.37, 0.6] });
      gl.enable(gl.BLEND);
      gl.blendEquationSeparate(ext.MIN_EXT, ext.MAX_EXT);
      draw(gl, TRIANGLE);
    },
  },
  ...[false, true].map((enabled) => ({
    id: `dither_${String(enabled)}`,
    label: `Dithering: ${enabled}`,
    draw(gl: Parameters<typeof draw>[0]) {
      if (enabled) gl.enable(gl.DITHER);
      else gl.disable(gl.DITHER);
      draw(gl, QUAD, { fragment: gradient('mediump') });
    },
  })),
  ...(['mediump', 'highp'] as const).map((precision) => ({
    id: `shader_${precision}`,
    label: `Fragment arithmetic: ${precision}`,
    draw(gl: Parameters<typeof draw>[0]) {
      let type: number = gl.MEDIUM_FLOAT;
      if (precision === 'highp') type = gl.HIGH_FLOAT;
      if (!gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, type)?.precision)
        throw new UnsupportedRenderFeature(`${precision} unavailable`);
      draw(gl, QUAD, {
        fragment: `precision ${precision} float;varying vec2 uv;void main(){float x=sin(uv.x*31.7)*cos(uv.y*19.3);gl_FragColor=vec4(fract(x*17.1),uv.x*uv.y,pow(uv.y,2.2),1.0);}`,
      });
    },
  })),
  {
    id: 'derivatives',
    label: 'Standard derivatives and analytical edge AA',
    draw(gl) {
      if (!gl.getExtension('OES_standard_derivatives'))
        throw new UnsupportedRenderFeature('OES_standard_derivatives unavailable');
      draw(gl, QUAD, {
        fragment:
          '#extension GL_OES_standard_derivatives : enable\nprecision mediump float;varying vec2 uv;void main(){float d=length(uv-0.5)-0.31;float a=1.0-smoothstep(-fwidth(d),fwidth(d),d);gl_FragColor=vec4(a,abs(dFdx(uv.x))*64.0,abs(dFdy(uv.y))*64.0,1.0);}',
      });
    },
  },
  {
    id: 'discard',
    label: 'Fragment discard and hard shader edges',
    draw(gl) {
      draw(gl, QUAD, {
        fragment:
          'precision mediump float;varying vec2 uv;void main(){if(length(uv-0.5)>0.37||mod(floor(uv.x*16.0),2.0)>0.5)discard;gl_FragColor=vec4(uv,0.7,1.0);}',
      });
    },
  },
  {
    id: 'default_msaa',
    label: 'Default framebuffer with antialias enabled',
    antialias: true,
    draw(gl) {
      draw(gl, TRIANGLE);
    },
  },
  {
    id: 'sample_coverage',
    label: 'Multisample coverage at 50%',
    antialias: true,
    draw(gl) {
      gl.enable(gl.SAMPLE_COVERAGE);
      gl.sampleCoverage(0.5, false);
      draw(gl, TRIANGLE);
    },
  },
  {
    id: 'alpha_to_coverage',
    label: 'Multisample alpha-to-coverage',
    antialias: true,
    draw(gl) {
      gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
      draw(gl, TRIANGLE, { color: [0.2, 0.7, 0.9, 0.5] });
    },
  },
  {
    id: 'premultiplied_context',
    label: 'Premultiplied canvas presentation',
    premultipliedAlpha: true,
    draw(gl) {
      draw(gl, TRIANGLE, { color: [0.1, 0.35, 0.45, 0.5] });
    },
  },
];
