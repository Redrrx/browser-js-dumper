import type { GPUResults } from './engine';
import type { LegacyEntry } from './types';
import type { PerfMeasurement, TimingResults } from './timing-types';
import { appendRenderingEntries } from './render-suite-data';
import {
  GPU_METRICS,
  TIMING_METRICS,
  READPIXEL_FIELDS,
  PERF_SAMPLE_FIELDS,
  projectMetrics,
} from './metric-fields';

type AddEntry = (key: string, value: unknown) => void;

function entryType(isNum: boolean, n: number): LegacyEntry['type'] {
  if (!isNum) return 'string';
  if (Number.isInteger(n)) return 'integer';
  return 'float';
}

export function gpuToEntries(r: Partial<GPUResults>): Map<string, LegacyEntry> {
  const m = new Map<string, LegacyEntry>();
  const add = (key: string, val: unknown) => {
    const n = parseFloat(String(val));
    const isNum = val !== null && !isNaN(n);
    m.set('bench.' + key, {
      type: entryType(isNum, n),
      display: String(val),
    });
  };
  addGPUPrecisionEntries(r, add);
  addGPURasterEntries(r, add);
  addGPUDisplayEntries(r, add);
  addGPUPipelineEntries(r, add);
  addGPUPerfEntries(r, add);
  appendRenderingEntries(m, 'canvas', r.canvas_primitives);
  appendRenderingEntries(m, 'webgl', r.webgl_primitives);
  return m;
}

export function timingToEntries(r: TimingResults): Map<string, LegacyEntry> {
  const m = new Map<string, LegacyEntry>();
  const add = (k: string, v: unknown) => {
    if (v == null) return;
    const n = parseFloat(String(v));
    const isNum = v !== null && !isNaN(n);
    m.set('timing.' + k, {
      type: entryType(isNum, n),
      display: String(v),
    });
  };
  addTimingClockEntries(r, add);
  addTimingRuntimeEntries(r, add);
  addTimingDeviceEntries(r, add);
  return m;
}

function addGPUPrecisionEntries(r: Partial<GPUResults>, add: AddEntry) {
  if (r.precision)
    for (const [sn, precs] of Object.entries(r.precision))
      for (const [pn, p] of Object.entries(precs)) {
        if (!p) {
          add('precision.' + sn + '.' + pn, 'null');
          continue;
        }
        add('precision.' + sn + '.' + pn + '.rangeMin', p.rangeMin);
        add('precision.' + sn + '.' + pn + '.rangeMax', p.rangeMax);
        add('precision.' + sn + '.' + pn + '.precision', p.precision);
      }
  if (r.highp) for (const [k, v] of Object.entries(r.highp)) add('highp.' + k, v);
  if (r.mediump) for (const [k, v] of Object.entries(r.mediump)) add('mediump.' + k, v);
  if (r.webgl_hash) add('hash.webgl_grid', r.webgl_hash);
  if (r.canvas_hash) add('hash.canvas_grid', r.canvas_hash);
  if (r.shapes_hash) add('hash.shapes_grid', r.shapes_hash);
}

function addGPURasterEntries(r: Partial<GPUResults>, add: AddEntry) {
  if (r.texture) {
    add('texture.sampled_r', r.texture.sampled[0]);
    add('texture.sampled_g', r.texture.sampled[1]);
    add('texture.sampled_b', r.texture.sampled[2]);
    add('texture.delta_r', r.texture.delta[0]);
    add('texture.delta_g', r.texture.delta[1]);
    add('texture.delta_b', r.texture.delta[2]);
  }
  if (r.readpixels)
    for (const [sz, d] of Object.entries(r.readpixels)) {
      if (d) {
        projectMetrics({ prefix: 'readpixels.' + sz, fields: READPIXEL_FIELDS }, d, add);
      }
    }
  if (r.subpixel?.results)
    r.subpixel.results.forEach((item, i) =>
      add('subpixel.offset' + i + '.filled', Number(item.filled)),
    );
  if (r.aa_pattern?.results)
    r.aa_pattern.results.forEach((item) => {
      add('aa.ang' + item.angle + '.spread', item.spread);
      add('aa.ang' + item.angle + '.full', item.full);
    });
}

function addGPUDisplayEntries(r: Partial<GPUResults>, add: AddEntry) {
  if (r.colorspace) {
    add('colorspace.p3_supported', Number(Boolean(r.colorspace.p3_supported)));
    if (r.colorspace.p3_red_srgb) {
      add('colorspace.p3_red_r', r.colorspace.p3_red_srgb[0]);
      add('colorspace.p3_red_g', r.colorspace.p3_red_srgb[1]);
      add('colorspace.p3_red_b', r.colorspace.p3_red_srgb[2]);
    }
    if (r.colorspace.gray128_delta != null)
      add('colorspace.gray128_delta', r.colorspace.gray128_delta);
    if (r.colorspace.alpha_half != null) add('colorspace.alpha_half', r.colorspace.alpha_half);
    add('colorspace.webgl_srgb', Number(Boolean(r.colorspace.webgl_srgb)));
  }
  if (r.offscreen?.main_ms != null) {
    projectMetrics(GPU_METRICS.offscreenMain, r.offscreen, add);
    if (r.offscreen.worker_ms != null)
      projectMetrics(GPU_METRICS.offscreenWorker, r.offscreen, add);
  }
  if (r.frame_timing) projectMetrics(GPU_METRICS.frame, r.frame_timing, add);
}

function addGPUPipelineEntries(r: Partial<GPUResults>, add: AddEntry) {
  if (r.blend?.tests)
    r.blend.tests.forEach((t) => {
      add('blend.a' + t.alpha + '.delta_r', t.delta[0]);
      add('blend.a' + t.alpha + '.delta_g', t.delta[1]);
      add('blend.a' + t.alpha + '.delta_b', t.delta[2]);
    });
  if (r.varying?.samples) {
    const mx = Math.max(...r.varying.samples.map((s) => Math.abs(s.delta)));
    add('varying.max_delta', mx);
  }
  if (r.texfilter?.samples)
    r.texfilter.samples.forEach((s) => add('texfilter.u' + s.u + '.r', s.r));
  if (r.derivative?.supported) {
    if (r.derivative.samples) {
      const dx = [...new Set(r.derivative.samples.map((s) => s.dfdx_raw))];
      add('derivative.dfdx_unique', dx.join(','));
      add(
        'derivative.dfdy_unique',
        [...new Set(r.derivative.samples.map((s) => s.dfdy_raw))].join(','),
      );
    }
  }
  if (r.depth?.tests)
    r.depth.tests.forEach((t) => add('depth.eps' + t.epsilon + '.winner', t.winner));
  if (r.stencil) {
    add('stencil.edge_x', r.stencil.edge_x);
    add('stencil.boundary', r.stencil.boundary?.join(','));
  }
  if (r.msaa?.supported && r.msaa.edgeValues) {
    add('msaa.max_samples', r.msaa.maxSamples);
    add('msaa.edge_levels', r.msaa.edgeValues.join(','));
    add('msaa.inferred_count', r.msaa.edgeValues.length + 1);
  }
}

function addGPUPerfEntries(r: Partial<GPUResults>, add: AddEntry) {
  if (r.perf) {
    projectMetrics(GPU_METRICS.performance, r.perf, add);
    if (r.perf._atomics10) {
      projectMetrics(GPU_METRICS.atomics, r.perf._atomics10 as { now: number; date: number }, add);
    }
    for (const [k, v] of Object.entries(r.perf)) {
      if (k.startsWith('_') || typeof v !== 'object' || !v) continue;
      const metric = v as Partial<PerfMeasurement>;
      projectMetrics({ prefix: 'perf.' + k, fields: PERF_SAMPLE_FIELDS }, metric, add);
    }
  }
}

function addTimingClockEntries(r: TimingResults, add: AddEntry) {
  if (r.clocks) projectMetrics(TIMING_METRICS.clocks, r.clocks, add);
  if (r.overhead) for (const [k, v] of Object.entries(r.overhead)) add('overhead.' + k, v);
  if (r.entries) {
    projectMetrics(TIMING_METRICS.entries, r.entries, add);
    if (r.entries.paint)
      for (const [k, v] of Object.entries(r.entries.paint)) add('entries.paint.' + k, v);
  }
  if (r.events) {
    projectMetrics(TIMING_METRICS.events, r.events, add);
    if (r.events.message_event) projectMetrics(TIMING_METRICS.message, r.events.message_event, add);
  }
}

function addTimingRuntimeEntries(r: TimingResults, add: AddEntry) {
  if (r.workers?.worker_result && !r.workers.worker_result.error) {
    projectMetrics(TIMING_METRICS.workers, r.workers.worker_result, add);
  }
  if (r.anim) projectMetrics(TIMING_METRICS.animation, r.anim, add);
  if (r.audio && !r.audio.error) {
    projectMetrics(TIMING_METRICS.audio, r.audio, add);
  }
  if (r.sched) {
    for (const [k, v] of Object.entries(r.sched)) add('sched.' + k, v);
  }
}

function addTimingDeviceEntries(r: TimingResults, add: AddEntry) {
  if (r.gputimers) {
    if (r.gputimers.webgl1?.us != null) add('gputimers.webgl1_us', r.gputimers.webgl1.us);
    if (r.gputimers.webgl2?.us != null) add('gputimers.webgl2_us', r.gputimers.webgl2.us);
    add('gputimers.webgl1_available', r.gputimers.webgl1?.available);
    add('gputimers.webgl2_available', r.gputimers.webgl2?.available);
  }
  if (r.hiprec) projectMetrics(TIMING_METRICS.highPrecision, r.hiprec, add);
  if (r.net) {
    projectMetrics(TIMING_METRICS.network, r.net, add);
    if (r.net.fetch_timing) projectMetrics(TIMING_METRICS.fetch, r.net.fetch_timing, add);
  }
}
