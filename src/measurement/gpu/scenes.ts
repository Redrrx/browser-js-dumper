import type { WebGLPreset, CanvasPreset, ParamValue } from './types';
import { context2D } from './resources';

function numberParam(p: Record<string, ParamValue>, key: string): number {
  const value = p[key];
  if (typeof value !== 'number') throw new Error('Missing numeric shader parameter: ' + key);
  return value;
}

export const BENCH_W = 256;
export const BENCH_H = 256;

export const BENCH_VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

function _glsl_entangled(p: Record<string, ParamValue>) {
  const T = numberParam(p, 'lineThickness').toFixed(4);
  const N = numberParam(p, 'noiseAmt').toFixed(4);
  const cm = p.colorMode;
  let bg =
    'vec3 col=vec3(sin(px*3.14159+0.5)*0.5+0.5,sin(py*3.14159+1.0)*0.5+0.5,sin((px+py)*2.0+1.5)*0.5+0.5);';
  let clrs = [
    '0.9,0.55,0.1',
    '0.7,0.15,0.9',
    '0.15,0.8,0.4',
    '1.0,0.85,0.1',
    '1.0,0.35,0.2',
    '0.25,0.65,1.0',
  ];
  if (cm === 'mono') {
    bg = 'float lum=sin(px*3.14159+0.5)*0.5+0.5;vec3 col=vec3(lum);';
    clrs = [
      '0.9,0.9,0.9',
      '0.6,0.6,0.6',
      '0.4,0.4,0.4',
      '1.0,1.0,1.0',
      '0.75,0.75,0.75',
      '0.5,0.5,0.5',
    ];
  } else if (cm === 'cool') {
    bg =
      'vec3 col=vec3(sin(px*3.14159+0.5)*0.2+0.1,sin(py*3.14159+1.0)*0.3+0.2,sin((px+py)*2.0+1.5)*0.5+0.5);';
    clrs = [
      '0.1,0.3,0.9',
      '0.0,0.6,0.8',
      '0.2,0.8,0.6',
      '0.8,0.9,1.0',
      '0.3,0.5,1.0',
      '0.0,0.7,1.0',
    ];
  }
  const sdf = ['ring', 'lemn', 'rose', 'star', 'spiral', 'ch'];
  const mx = sdf
    .map((n, i) => `col=mix(col,vec3(${clrs[i]}),smoothstep(0.01,0.0,${n}));`)
    .join(' ');
  return `precision highp float;uniform vec2 u_res;
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;float px=uv.x*2.0-1.0,py=uv.y*2.0-1.0;
  float r=length(vec2(px,py)),a=atan(py,px);
  float T=${T};
  float ring=abs(r-0.55-sin(a*3.0)*0.07)-T;
  float lemn=abs(r-sqrt(max(0.0,cos(a*2.0))*0.62))-T;
  float rose=abs(r-abs(cos(a*2.5))*0.50)-T;
  float star=r-(0.20+0.09*sin(a*7.0));
  float spiral=abs(r-sqrt(abs(a+3.14159)/3.14159)*0.68)-T;
  float ch=min(min(abs(length(vec2(px-0.28,py))-0.28),abs(length(vec2(px+0.28,py))-0.28)),min(abs(length(vec2(px,py-0.28))-0.28),abs(length(vec2(px,py+0.28))-0.28)))-T;
  float noise=fract(sin(dot(vec2(px,py),vec2(127.1,311.7)))*43758.5453);
  ${bg} ${mx} col+=noise*${N};
  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}`;
}

function _glsl_mandelbrot(p: Record<string, ParamValue>) {
  const mi = numberParam(p, 'maxIter') | 0;
  const cy = numberParam(p, 'cycles').toFixed(2);
  return `precision highp float;uniform vec2 u_res;
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  vec2 c=(uv-vec2(0.5))*vec2(3.5,2.5)+vec2(-0.7,0.0);
  vec2 z=vec2(0.0);float it=0.0;
  for(int i=0;i<${mi};i++){
    float x=z.x*z.x-z.y*z.y+c.x,y=2.0*z.x*z.y+c.y;
    z=vec2(x,y);if(dot(z,z)>4.0){it=float(i);break;}it=float(i)+1.0;
  }
  bool inside=it>=float(${mi})-0.5;
  float t=it/float(${mi});
  vec3 col=inside?vec3(0.02,0.02,0.06):vec3(sin(t*6.28318*${cy})*0.5+0.5,sin(t*6.28318*${cy}+2.094)*0.5+0.5,sin(t*6.28318*${cy}+4.189)*0.5+0.5);
  gl_FragColor=vec4(col,1.0);
}`;
}

function _glsl_voronoi(p: Record<string, ParamValue>) {
  const sc = numberParam(p, 'scale').toFixed(2);
  const ew = numberParam(p, 'edgeWidth').toFixed(3);
  return `precision highp float;uniform vec2 u_res;
vec2 h2(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5);}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res*${sc};
  vec2 gi=floor(uv),gf=fract(uv);
  float d1=99.0,d2=99.0;vec2 mp=vec2(0.5);
  for(int y=-2;y<=2;y++) for(int x=-2;x<=2;x++){
    vec2 n=vec2(float(x),float(y)),rp=0.5+0.5*sin(h2(gi+n)*6.28318);
    float d=dot(n+rp-gf,n+rp-gf);
    if(d<d1){d2=d1;d1=d;mp=rp;}else if(d<d2)d2=d;
  }
  float edge=sqrt(d2)-sqrt(d1);
  vec3 col=vec3(sqrt(d1)*0.9,mp.x*0.65+0.15,mp.y*0.6+0.1);
  col=mix(col,vec3(1.0,0.9,0.3),smoothstep(${ew},0.0,edge));
  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}`;
}

function _glsl_trig_stress(p: Record<string, ParamValue>) {
  const d = Math.max(1, Math.min(16, numberParam(p, 'density') | 0));
  return `precision highp float;uniform vec2 u_res;
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;vec2 p=uv*2.0-1.0;float v=0.0;
  for(int i=1;i<=${d};i++){
    float fi=float(i)*0.7853981;
    v+=sin(p.x*float(i)*3.14159+cos(p.y*float(i)+fi))*cos(p.y*float(i)*2.71828+sin(p.x*float(i)-fi));
    v+=atan(p.y*float(i),p.x*float(i)+0.0001)*inversesqrt(length(p)*float(i)+0.0001);
  }
  v=v/float(${d * 2})*0.5+0.5;v=clamp(v,0.0,1.0);
  gl_FragColor=vec4(sin(v*6.28318)*0.5+0.5,sin(v*6.28318+2.094)*0.5+0.5,sin(v*6.28318+4.189)*0.5+0.5,1.0);
}`;
}

function _glsl_fractal(p: Record<string, ParamValue>) {
  const sc = numberParam(p, 'scale').toFixed(2);
  const oc = Math.max(1, Math.min(8, numberParam(p, 'octaves') | 0));
  const wa = numberParam(p, 'warpAmt').toFixed(2);
  return `precision highp float;uniform vec2 u_res;
float hsh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hsh(i),hsh(i+vec2(1,0)),f.x),mix(hsh(i+vec2(0,1)),hsh(i+vec2(1,1)),f.x),f.y);}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  vec2 p=uv*${sc};
  vec2 w=vec2(vn(p+vec2(1.7,9.2)),vn(p+vec2(8.3,2.8)));p+=w*${wa};
  float v=0.0,amp=0.5;vec2 q=p;
  for(int i=0;i<${oc};i++){v+=vn(q)*amp;q=mat2(1.6,1.2,-1.2,1.6)*q;amp*=0.5;}
  vec3 col=vec3(v,vn(uv*${sc}*2.3+vec2(3.1,1.7))*0.6+0.2,1.0-v+vn(uv*${sc}*1.7+vec2(5.2,8.1))*0.3);
  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}`;
}

export const BENCH_FS = _glsl_entangled({
  lineThickness: 0.013,
  noiseAmt: 0.04,
  colorMode: 'vivid',
});

export const WEBGL_PRESETS: WebGLPreset[] = [
  {
    id: 'entangled',
    name: 'Entangled SDF',
    desc: 'Ring · lemniscate · rose · star · Fermat spiral · 4-link chain. Stresses smoothstep, atan, sqrt at every pixel.',
    tags: ['SDF', 'trig', 'boundaries'],
    params: [
      {
        id: 'lineThickness',
        label: 'Line thickness',
        type: 'range',
        min: 0.004,
        max: 0.05,
        step: 0.001,
        default: 0.013,
      },
      {
        id: 'noiseAmt',
        label: 'Noise amount',
        type: 'range',
        min: 0,
        max: 0.2,
        step: 0.005,
        default: 0.04,
      },
      {
        id: 'colorMode',
        label: 'Color mode',
        type: 'select',
        options: ['vivid', 'cool', 'mono'],
        default: 'vivid',
      },
    ],
    buildFs: _glsl_entangled,
  },
  {
    id: 'mandelbrot',
    name: 'Mandelbrot',
    desc: 'Escape-time fractal. Up to maxIter z²+c iterations per pixel. Detects float32 divergence at the boundary — the thinner the edge, the more GPU precision matters.',
    tags: ['fractal', 'iteration', 'boundary'],
    params: [
      {
        id: 'maxIter',
        label: 'Max iterations',
        type: 'range',
        min: 32,
        max: 256,
        step: 8,
        default: 80,
      },
      {
        id: 'cycles',
        label: 'Color cycles',
        type: 'range',
        min: 0.5,
        max: 8,
        step: 0.5,
        default: 2.5,
      },
    ],
    buildFs: _glsl_mandelbrot,
  },
  {
    id: 'voronoi',
    name: 'Voronoi Cells',
    desc: 'Worley noise / Voronoi: 25 nearest-cell distance lookups per pixel. Exercises sqrt, fract, floor, dot across a dense spatial field.',
    tags: ['distance', 'sqrt', 'floor'],
    params: [
      { id: 'scale', label: 'Cell scale', type: 'range', min: 1, max: 12, step: 0.5, default: 4.5 },
      {
        id: 'edgeWidth',
        label: 'Edge width',
        type: 'range',
        min: 0.005,
        max: 0.1,
        step: 0.005,
        default: 0.03,
      },
    ],
    buildFs: _glsl_voronoi,
  },
  {
    id: 'trig_stress',
    name: 'Trig Stress',
    desc: 'Nested sin/cos/atan/inversesqrt loops per pixel. Each iteration compounds float rounding — more density = stronger fingerprint divergence between GPUs.',
    tags: ['sin', 'cos', 'atan', 'ALU'],
    params: [
      { id: 'density', label: 'Trig density', type: 'range', min: 1, max: 12, step: 1, default: 4 },
    ],
    buildFs: _glsl_trig_stress,
  },
  {
    id: 'fractal',
    name: 'Fractal Noise',
    desc: 'fBm (fractional Brownian motion) with domain warping. Tests value noise hash, mat2 multiply, multi-octave accumulation. Warp distorts UV before sampling.',
    tags: ['noise', 'fBm', 'fract'],
    params: [
      { id: 'scale', label: 'UV scale', type: 'range', min: 1, max: 10, step: 0.5, default: 3.5 },
      { id: 'octaves', label: 'Octaves', type: 'range', min: 1, max: 8, step: 1, default: 4 },
      {
        id: 'warpAmt',
        label: 'Domain warp',
        type: 'range',
        min: 0,
        max: 2,
        step: 0.1,
        default: 0.8,
      },
    ],
    buildFs: _glsl_fractal,
  },
  {
    id: 'custom',
    name: 'Custom GLSL',
    desc: 'Write your own fragment shader. Must declare: precision highp float; uniform vec2 u_res; — u_res is the canvas resolution in pixels.',
    tags: ['custom', 'GLSL'],
    params: [],
    buildFs: null,
  },
];

export const CANVAS_LAYER_DEFS = [
  {
    id: 'linearGradientBg',
    label: 'Linear gradient BG',
    tip: 'createLinearGradient across the full canvas diagonal. Tests gradient color interpolation precision.',
  },
  {
    id: 'radialGradientBlobs',
    label: 'Radial gradient blobs',
    tip: 'Two radialGradient blobs with alpha. Tests radial interpolation and alpha compositing precision.',
  },
  {
    id: 'arcs',
    label: 'Arcs',
    tip: '6 arcs with fractional radii + line widths. Exercises sub-pixel antialiasing — differs between GPU vendors.',
  },
  {
    id: 'beziers',
    label: 'Bézier curves',
    tip: '4 cubic bezierCurveTo strokes. Tests tessellation quality and AA edge coverage (Skia vs CoreGraphics vs Cairo).',
  },
  {
    id: 'shadowBlur',
    label: 'Shadow blur',
    tip: '3 shapes with shadowBlur. GPU Gaussian blur varies per driver — Apple/NVIDIA/Intel produce measurably different spreads.',
  },
  {
    id: 'screenComposite',
    label: 'Screen composite',
    tip: "globalCompositeOperation='screen'. Alpha blend precision differs between compositing pipelines.",
  },
  {
    id: 'text',
    label: 'Text rendering',
    tip: 'Multi-font text. The #1 Canvas 2D fingerprint signal — ClearType/CoreText/FreeType produce different subpixel AA patterns.',
  },
];

export const DEFAULT_TEXT_STRINGS = [
  { text: 'Cwm fjord bank glyphs vext quiz!', font: '12px serif' },
  { text: 'The quick brown fox 0123456789', font: '11px sans-serif' },
  { text: '!@#$%^&*()-+=[]{}|;:\'",.<>?/\\', font: 'bold 10px monospace' },
  { text: 'Sphinx of black quartz, judge my vow.', font: 'italic 11px Georgia, serif' },
  {
    text: '\u03B1\u03B2\u03B3 \u00E9\u00E0\u00FC \u2603\u2665\u221E\u03C0\u2248',
    font: '10px Arial, sans-serif',
  },
];

export const CANVAS_PRESETS: CanvasPreset[] = [
  {
    id: 'fingerprint',
    name: 'Full Fingerprint',
    desc: 'All layers active. Maximum fingerprinting surface: gradients, arcs, béziers, shadow blur, screen composite, multi-font text.',
    tags: ['text', 'shadow', 'gradient', 'all'],
    defaultLayers: {
      linearGradientBg: true,
      radialGradientBlobs: true,
      arcs: true,
      beziers: true,
      shadowBlur: true,
      screenComposite: true,
      text: true,
    },
    defaultTextStrings: DEFAULT_TEXT_STRINGS,
  },
  {
    id: 'text_only',
    name: 'Text Only',
    desc: 'Text rendering only. ClearType (Windows) vs CoreText (macOS/iOS) vs FreeType (Linux) produce different subpixel AA patterns — isolated here without other noise.',
    tags: ['text', 'fonts', 'AA'],
    defaultLayers: {
      linearGradientBg: false,
      radialGradientBlobs: false,
      arcs: false,
      beziers: false,
      shadowBlur: false,
      screenComposite: false,
      text: true,
    },
    defaultTextStrings: DEFAULT_TEXT_STRINGS,
  },
  {
    id: 'geometry',
    name: 'Geometry Only',
    desc: 'Arcs and béziers only — no text, no shadows. Isolates sub-pixel rasterization and AA edge coverage differences between GPU compositing backends.',
    tags: ['arcs', 'bezier', 'AA'],
    defaultLayers: {
      linearGradientBg: true,
      radialGradientBlobs: false,
      arcs: true,
      beziers: true,
      shadowBlur: false,
      screenComposite: false,
      text: false,
    },
    defaultTextStrings: DEFAULT_TEXT_STRINGS,
  },
  {
    id: 'shadow_stress',
    name: 'Shadow Stress',
    desc: 'Heavy Gaussian blur load. Apple M-series uses a fast separable pass; Linux/Windows use software paths — produces measurable blur-spread differences.',
    tags: ['shadow', 'Gaussian', 'blur'],
    defaultLayers: {
      linearGradientBg: true,
      radialGradientBlobs: true,
      arcs: false,
      beziers: false,
      shadowBlur: true,
      screenComposite: false,
      text: false,
    },
    defaultTextStrings: DEFAULT_TEXT_STRINGS,
  },
  {
    id: 'compositing',
    name: 'Composite Modes',
    desc: 'Screen compositing + gradients + arcs. Tests how the GPU compositing pipeline handles non-standard blend modes. Screen-mode alpha precision differs between Skia/CoreGraphics.',
    tags: ['composite', 'blend', 'alpha'],
    defaultLayers: {
      linearGradientBg: true,
      radialGradientBlobs: true,
      arcs: true,
      beziers: false,
      shadowBlur: false,
      screenComposite: true,
      text: false,
    },
    defaultTextStrings: DEFAULT_TEXT_STRINGS,
  },
  {
    id: 'custom',
    name: 'Custom',
    desc: 'Toggle individual layers on/off and edit text strings. Full control over the Canvas 2D fingerprint surface.',
    tags: ['custom'],
    defaultLayers: {
      linearGradientBg: true,
      radialGradientBlobs: true,
      arcs: true,
      beziers: true,
      shadowBlur: true,
      screenComposite: true,
      text: true,
    },
    defaultTextStrings: DEFAULT_TEXT_STRINGS,
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Style',
    desc: "Faithful reconstruction of Cloudflare's Turnstile canvas fingerprint. 125×125 canvas, fake 'aanotafontaa' font at fractional px sizes (250/9, 250/21), radial gradients with shadow, bezier/quadratic/ellipse paths. Same coordinates as the live script. Includes emoji color test (🇺🇸 on 1×1 canvas).",
    tags: ['cloudflare', 'anti-bot', 'fingerprint', 'shadow', 'gradient', 'text'],
    canvasSize: 125,
    render(ctx) {
      const W = 125;
      const H = 125;
      ctx.clearRect(0, 0, W, H);

      function rg(
        x0: number,
        y0: number,
        r0: number,
        x1: number,
        y1: number,
        r1: number,
        c0: string,
        c1: string,
      ) {
        const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
        g.addColorStop(0, c0);
        g.addColorStop(1, c1);
        ctx.fillStyle = g;
      }

      rg(33, 18, 8, 42, 10, 226, '#F38020', 'rgba(243,128,32,0)');
      ctx.shadowColor = '#F38020';
      ctx.shadowBlur = 11;
      ctx.beginPath();
      ctx.moveTo(9, 14);
      ctx.quadraticCurveTo(93, 48, 116, 111);
      ctx.stroke();
      ctx.fill();
      ctx.shadowBlur = 0;

      rg(77, 98, 2, 27, 30, 206, 'rgba(80,100,255,0.9)', 'rgba(40,60,200,0)');
      ctx.beginPath();
      ctx.ellipse(58, 55, 31, 28, 1.444171, 0.540113, 4.052234);
      ctx.stroke();
      ctx.fill();

      rg(108, 12, 10, 65, 118, 169, '#809980', 'rgba(128,153,128,0)');
      ctx.shadowColor = '#809980';
      ctx.shadowBlur = 16;
      ctx.font = '27.77777777777778px aanotafontaa';
      ctx.fillText('Ry', 13, 67);
      ctx.shadowBlur = 0;

      rg(46, 47, 0, 101, 108, 207, '#FF6633', 'rgba(255,102,51,0)');
      ctx.shadowColor = '#FF6633';
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.moveTo(54, 5);
      ctx.bezierCurveTo(54, 90, 32, 74, 71, 120);
      ctx.stroke();
      ctx.fill();
      ctx.shadowBlur = 0;

      rg(119, 123, 3, 109, 90, 137, '#B3B31A', 'rgba(179,179,26,0)');
      ctx.shadowColor = '#B3B31A';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(76, 0);
      ctx.bezierCurveTo(1, 49, 103, 67, 49, 125);
      ctx.stroke();
      ctx.fill();
      ctx.shadowBlur = 0;

      rg(34, 47, 1, 37, 59, 245, '#809900', 'rgba(128,153,0,0)');
      ctx.beginPath();
      ctx.ellipse(56, 57, 14, 8, 1.227313, 4.192614, 2.885354);
      ctx.stroke();
      ctx.fill();

      rg(34, 47, 1, 37, 59, 245, '#809900', 'rgba(128,153,0,0)');
      ctx.shadowColor = '#809900';
      ctx.shadowBlur = 14;
      ctx.font = '11.904761904761905px aanotafontaa';
      ctx.strokeText('@H1', 30, 73);
      ctx.shadowBlur = 0;
    },
    emojiTest() {
      const c = Object.assign(document.createElement('canvas'), { width: 1, height: 1 });
      const cx = context2D(c);
      cx.font = '1px sans-serif';
      cx.fillText('\uD83C\uDDFA\uD83C\uDDF8', 0, 1);
      const alpha = cx.getImageData(0, 0, 1, 1).data[3]!;
      c.width = 0;
      c.height = 0;
      return alpha;
    },
  },
];
