import { RENDER_CASES } from '../measurement/gpu/render-suite';
import type { RenderBackend } from '../measurement/gpu/render-suite-types';

type Labels = Readonly<Record<string, string>>;
type LabelGroup = readonly [name: string, fields: Labels];

const GROUPS: Readonly<Record<string, LabelGroup>> = {
  'bench.hash': [
    'Image hashes',
    {
      webgl_grid: 'WebGL grid pixel hash',
      canvas_grid: 'Canvas 2D grid pixel hash',
      shapes_grid: 'WebGL shapes pixel hash',
    },
  ],
  'bench.texture': [
    'Texture sampling',
    {
      sampled_r: 'sampled red',
      sampled_g: 'sampled green',
      sampled_b: 'sampled blue',
      delta_r: 'red error',
      delta_g: 'green error',
      delta_b: 'blue error',
    },
  ],
  'bench.colorspace': [
    'Color space',
    {
      p3_supported: 'Display P3 context supported',
      p3_red_r: 'Display P3 red · red readback',
      p3_red_g: 'Display P3 red · green readback',
      p3_red_b: 'Display P3 red · blue readback',
      gray128_delta: 'gray 128 · red error',
      alpha_half: 'half-opacity red · alpha readback',
      webgl_srgb: 'WebGL EXT_sRGB supported',
    },
  ],
  'bench.offscreen': [
    'Offscreen canvas',
    {
      main_ms: 'main-thread mean render time',
      worker_ms: 'worker mean render time',
      ratio: 'main-thread / worker time ratio',
    },
  ],
  'bench.frame': [
    'Frame timing',
    {
      fps_mean: 'mean frame rate',
      ms_mean: 'mean frame interval',
      ms_sigma: 'frame interval standard deviation',
      ms_p99: '99th-percentile frame interval',
      ms_max: 'maximum frame interval',
      vsync_hz: 'estimated refresh rate',
      headroom_pct: 'headroom relative to 60 Hz',
    },
  ],
  'bench.varying': ['Varying interpolation', { max_delta: 'maximum absolute error' }],
  'bench.derivative': [
    'Shader derivatives',
    {
      dfdx_unique: 'distinct encoded dFdx red values',
      dfdy_unique: 'distinct encoded dFdy green values',
    },
  ],
  'bench.stencil': [
    'Stencil edge',
    {
      edge_x: 'first boundary transition x (pixels)',
      boundary: 'boundary red values',
    },
  ],
  'bench.msaa': [
    'Multisample anti-aliasing',
    {
      max_samples: 'maximum supported samples',
      edge_levels: 'distinct partial-coverage red values',
      inferred_count: 'inferred count (partial-coverage levels + 1)',
    },
  ],
  'bench.perf': [
    'Performance clocks',
    {
      _nowTick: 'minimum observed performance.now() tick',
      _dateTick: 'minimum observed Date.now() tick',
      _origin: 'time origin (Unix epoch)',
      _hasSAB: 'SharedArrayBuffer and Atomics available',
      _crossOriginIsolated: 'cross-origin isolated',
      '_atomics10.now': 'Atomics.wait(10 ms) · performance.now() elapsed',
      '_atomics10.date': 'Atomics.wait(10 ms) · Date.now() elapsed',
    },
  ],
  'timing.clocks': [
    'Clocks',
    {
      perf_now_tick: 'minimum observed performance.now() tick',
      date_now_tick: 'minimum observed Date.now() tick',
      time_origin: 'time origin (Unix epoch)',
      cross_origin_isolated: 'cross-origin isolated',
      has_sab: 'SharedArrayBuffer and Atomics available',
    },
  ],
  'timing.overhead': [
    'Timing API overhead',
    {
      perf_now_us: 'performance.now() per call',
      date_now_us: 'Date.now() per call',
      new_date_us: 'new Date().getTime() per call',
      mark_us: 'mark and clear per iteration',
      measure_us: 'two marks, measure and cleanup per iteration',
      get_entries_us: 'getEntries() per call',
      get_entries_by_type_us: 'getEntriesByType(resource) per call',
    },
  ],
  'timing.entries': [
    'Performance entries',
    {
      entry_count: 'total entry count',
      resource_count: 'resource entry count',
      lcp_ts: 'largest contentful paint timestamp',
      'paint.first-paint': 'first paint timestamp',
      'paint.first-contentful-paint': 'first contentful paint timestamp',
    },
  ],
  'timing.events': [
    'Event timing',
    {
      mouse_event_ts: 'synthetic click timestamp',
      pointer_event_ts: 'synthetic pointerdown timestamp',
      keyboard_event_ts: 'synthetic keydown timestamp',
      'message_event.round_trip_us': 'MessageChannel delivery elapsed',
    },
  ],
  'timing.workers': [
    'Worker timing',
    {
      round_trip_ms: 'request round trip',
      perf_now: 'worker performance.now()',
    },
  ],
  'timing.anim': [
    'Animation timing',
    {
      timeline_current: 'document timeline current time',
      raf_ts: 'requestAnimationFrame timestamp',
    },
  ],
  'timing.audio': [
    'Audio timing',
    {
      current_time: 'context current time',
      sample_rate: 'sample rate',
      base_latency: 'base latency',
      output_latency: 'output latency',
    },
  ],
  'timing.sched': [
    'Scheduling',
    {
      set_timeout_0ms: 'setTimeout(0 ms) median delay',
      set_timeout_1ms: 'setTimeout(1 ms) median delay',
      set_timeout_4ms: 'setTimeout(4 ms) median delay',
      microtask_us: 'queueMicrotask delay',
      promise_then_us: 'Promise.then delay',
      idle_callback_ms: 'requestIdleCallback delay',
      scheduler_post_task_ms: 'user-visible scheduler.postTask delay',
    },
  ],
  'timing.gputimers': [
    'GPU timer queries',
    {
      webgl1_us: 'WebGL 1 elapsed',
      webgl2_us: 'WebGL 2 elapsed',
      webgl1_available: 'WebGL 1 timer available',
      webgl2_available: 'WebGL 2 timer available',
    },
  ],
  'timing.hiprec': [
    'High-resolution timing',
    {
      has_sab: 'SharedArrayBuffer available',
      has_atomics: 'Atomics available',
      wait_1ms_now: 'Atomics.wait(1 ms) · performance.now() elapsed',
      wait_1ms_date: 'Atomics.wait(1 ms) · Date.now() elapsed',
      waitasync_5ms: 'Atomics.waitAsync(5 ms) elapsed',
    },
  ],
  'timing.net': [
    'Network timing',
    {
      rtt_ms: 'reported connection round trip',
      effective_type: 'effective connection type',
      fetch_round_trip_ms: 'same-origin HEAD fetch elapsed',
    },
  ],
};

const MATH: Labels = {
  sin: 'sine',
  cos: 'cosine',
  tan: 'tangent',
  asin: 'arcsine',
  acos: 'arccosine',
  atan1: 'arctangent (one argument)',
  atan2: 'arctangent (two arguments)',
  exp: 'natural exponential',
  log: 'natural logarithm',
  exp2: 'base-2 exponential',
  log2: 'base-2 logarithm',
  sqrt: 'square root',
  inversesqrt: 'inverse square root',
  pow: 'power',
  fma: 'multiply-add (a × b + a)',
  sum_fp: 'floating-point sum (0.1 + 0.2)',
  fract: 'fractional part',
  mod: 'modulo',
  smoothstep: 'smoothstep interpolation',
  mix: 'linear interpolation',
  normalize_x: 'normalized 2D vector · x component',
  length_2d: '2D vector length',
  dot_2d: '2D dot product',
  reflect_x: 'reflected 2D vector · x component',
  cross_z: '3D cross product · z component',
};
const MATH_GROUPS: Labels = {
  highp: 'High-precision shader math',
  mediump: 'Medium-precision shader math',
};
const SHADERS: Labels = { vs: 'vertex shader', fs: 'fragment shader' };
const PRECISIONS: Labels = {
  highp_float: 'high-precision float',
  mediump_float: 'medium-precision float',
  lowp_float: 'low-precision float',
  highp_int: 'high-precision integer',
  mediump_int: 'medium-precision integer',
  lowp_int: 'low-precision integer',
};
const PRECISION_FIELDS: Labels = {
  rangeMin: 'minimum range exponent',
  rangeMax: 'maximum range exponent',
  precision: 'precision bits',
};
const PERF_OPERATIONS: Labels = {
  ctx_webgl_create: 'WebGL context creation',
  shader_simple_10x: 'simple shader compile and link × 10',
  shader_sdf_compile: 'SDF shader compile and link',
  draw_1000_flush: 'draw calls × 1000 with gl.finish()',
  draw_1000_noflush: 'draw calls × 1000 without gl.finish()',
  readpixels_5x: '256 × 256 pixel readback × 5',
  c2d_fillrect_500: 'Canvas 2D fillRect × 500',
  c2d_getimagedata_5x: 'Canvas 2D getImageData × 5',
  c2d_todataurl_5x: 'Canvas 2D PNG toDataURL × 5',
};
const PERF_FIELDS: Labels = {
  now: 'performance.now() elapsed',
  measure: 'performance.measure() duration',
  date: 'Date.now() elapsed',
  startAt: 'performance measure start timestamp',
};

type DynamicFamily = {
  group: string;
  parameter: string;
  suffix: string;
  fields: Labels;
};
const DYNAMIC: Readonly<Record<string, DynamicFamily>> = {
  'aa.ang': {
    group: 'Anti-aliasing',
    parameter: '',
    suffix: '°',
    fields: { full: 'fully covered pixels', spread: 'covered pixels (full + partial)' },
  },
  'blend.a': {
    group: 'Alpha blending',
    parameter: 'α ',
    suffix: '',
    fields: { delta_r: 'red error', delta_g: 'green error', delta_b: 'blue error' },
  },
  'readpixels.': {
    group: 'Pixel readback',
    parameter: '',
    suffix: '',
    fields: { ms: 'mean read time', mpx: 'throughput (megapixels/s)' },
  },
  'subpixel.offset': {
    group: 'Subpixel rasterization',
    parameter: 'offset index ',
    suffix: '',
    fields: { filled: 'edge pixel filled (red > 64)' },
  },
  'texfilter.u': {
    group: 'Linear texture filtering',
    parameter: 'u ',
    suffix: '',
    fields: { r: 'sampled red' },
  },
  'depth.eps': {
    group: 'Depth precision',
    parameter: 'ε ',
    suffix: '',
    fields: { winner: 'winning surface' },
  },
};
const DYNAMIC_KEY =
  /^bench\.(aa\.ang|blend\.a|readpixels\.|subpixel\.offset|texfilter\.u|depth\.eps)([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\.([a-z_]+)$/i;

function mappedLabel(key: string): string | undefined {
  const parts = key.split('.');
  const group = GROUPS[parts.slice(0, 2).join('.')];
  if (!group) return undefined;
  const field = group[1][parts.slice(2).join('.')];
  if (field) return `${group[0]} · ${field}`;
  return undefined;
}

function shaderLabel(key: string): string | undefined {
  const parts = key.split('.');
  if (parts[0] !== 'bench') return undefined;
  const mathGroup = MATH_GROUPS[parts[1] ?? ''];
  const operation = MATH[parts[2] ?? ''];
  if (mathGroup && operation && parts.length === 3) return `${mathGroup} · ${operation}`;
  if (parts[1] !== 'precision') return undefined;
  const shader = SHADERS[parts[2] ?? ''];
  const precision = PRECISIONS[parts[3] ?? ''];
  if (!shader || !precision) return undefined;
  const base = `Shader precision · ${shader} · ${precision}`;
  if (parts.length === 4) return base;
  const field = PRECISION_FIELDS[parts[4] ?? ''];
  if (field && parts.length === 5) return `${base} · ${field}`;
  return undefined;
}

function performanceLabel(key: string): string | undefined {
  const parts = key.split('.');
  if (parts[0] !== 'bench' || parts[1] !== 'perf' || parts.length !== 4) return undefined;
  const operation = PERF_OPERATIONS[parts[2] ?? ''];
  const field = PERF_FIELDS[parts[3] ?? ''];
  if (operation && field) return `Performance · ${operation} · ${field}`;
  return undefined;
}

function dynamicLabel(key: string): string | undefined {
  const match = DYNAMIC_KEY.exec(key);
  if (!match) return undefined;
  const family = DYNAMIC[match[1] ?? ''];
  if (!family) return undefined;
  const field = family.fields[match[3] ?? ''];
  if (!field) return undefined;
  const value = match[2] ?? '';
  if (match[1] === 'readpixels.') {
    return `${family.group} · ${value} × ${value} pixels · ${field}`;
  }
  return `${family.group} · ${family.parameter}${value}${family.suffix} · ${field}`;
}

function readableFallback(key: string): string {
  const readable = key
    .replace(/^(?:bench|timing)\./, '')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[_.-]+/g, (separator, offset: number, source: string) => {
      if (
        separator === '.' &&
        /\d/.test(source[offset - 1] ?? '') &&
        /\d/.test(source[offset + 1] ?? '')
      )
        return separator;
      if (separator === '-' && /\d/.test(source[offset + 1] ?? '')) return separator;
      if (separator.includes('.')) return ' · ';
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
  if (!readable) return key;
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

const RENDER_FIELDS: Labels = {
  status: 'capture status',
  hash: 'SHA-256 RGBA',
  detail: 'capture note',
  colored_pixels: 'nonblack visible pixels',
  partial_alpha_pixels: 'partial-alpha pixels',
  colors: 'distinct RGBA colors',
};
function renderingLabel(key: string): string | undefined {
  const match = /^bench\.render\.(canvas|webgl)_v1\.([a-z0-9_]+)\.([a-z_]+)$/.exec(key);
  if (!match) return undefined;
  const backend = match[1] as RenderBackend;
  const recipe = RENDER_CASES[backend].find((item) => item.id === match[2]);
  const field = RENDER_FIELDS[match[3]!];
  if (!recipe || !field) return undefined;
  let label = 'WebGL';
  if (backend === 'canvas') label = 'Canvas 2D';
  return `Rendering baseline · ${label} · ${recipe.label} · ${field}`;
}

export function measurementLabel(key: string): string {
  return (
    renderingLabel(key) ??
    mappedLabel(key) ??
    shaderLabel(key) ??
    performanceLabel(key) ??
    dynamicLabel(key) ??
    readableFallback(key)
  );
}
