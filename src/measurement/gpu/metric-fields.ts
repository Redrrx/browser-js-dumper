import type { GPUResults } from './engine';
import type { OffscreenResult } from './probe-types';
import type {
  Clocks,
  Entries,
  Events,
  WorkerResult,
  Animation,
  Audio,
  HighPrecision,
  Network,
  FetchTiming,
  PerfResults,
  PerfMeasurement,
} from './timing-types';

export type MetricUnit = '' | 's' | 'ms' | 'µs' | 'ns' | 'Hz' | 'fps' | '%' | 'MP' | 'Mbit/s';
// Each field declares its source property, unit, and optional legacy export name.
export type MetricFields<T> = readonly (readonly [Extract<keyof T, string>, MetricUnit, string?])[];
interface MetricGroup<T> {
  prefix: string;
  fields: MetricFields<T>;
}
function group<T>(prefix: string, fields: MetricFields<T>): MetricGroup<T> {
  return { prefix, fields };
}
export function projectMetrics<T>(
  definition: MetricGroup<T>,
  source: T,
  add: (key: string, value: unknown) => void,
): void {
  for (const [field, , name = field] of definition.fields) {
    add(`${definition.prefix}.${name}`, source[field]);
  }
}

export const GPU_METRICS = {
  offscreenMain: group<OffscreenResult>('offscreen', [['main_ms', 'ms']]),
  offscreenWorker: group<OffscreenResult>('offscreen', [
    ['worker_ms', 'ms'],
    ['ratio', ''],
  ]),
  frame: group<NonNullable<GPUResults['frame_timing']>>('frame', [
    ['fps_mean', 'fps'],
    ['frame_ms_mean', 'ms', 'ms_mean'],
    ['frame_ms_sigma', 'ms', 'ms_sigma'],
    ['frame_ms_p99', 'ms', 'ms_p99'],
    ['frame_ms_max', 'ms', 'ms_max'],
    ['vsync_hz', 'Hz'],
    ['headroom_pct', '%'],
  ]),
  performance: group<PerfResults>('perf', [
    ['_nowTick', 'ms'],
    ['_dateTick', 'ms'],
    ['_origin', 'ms'],
    ['_hasSAB', ''],
    ['_crossOriginIsolated', ''],
  ]),
  atomics: group<{ now: number; date: number }>('perf._atomics10', [
    ['now', 'ms'],
    ['date', 'ms'],
  ]),
};

export const TIMING_METRICS = {
  clocks: group<Clocks>('clocks', [
    ['perf_now_tick', 'ms'],
    ['date_now_tick', 'ms'],
    ['time_origin', 'ms'],
    ['cross_origin_isolated', ''],
    ['has_sab', ''],
  ]),
  entries: group<Entries>('entries', [
    ['entry_count', ''],
    ['resource_count', ''],
    ['lcp_ts', 'ms'],
  ]),
  // Browser-defined paint names; exports still retain any additional browser entries.
  paint: group<NonNullable<Entries['paint']>>('entries.paint', [
    ['first-paint', 'ms'],
    ['first-contentful-paint', 'ms'],
  ]),
  events: group<Events>('events', [
    ['mouse_event_ts', 'ms'],
    ['pointer_event_ts', 'ms'],
    ['keyboard_event_ts', 'ms'],
  ]),
  message: group<NonNullable<Events['message_event']>>('events.message_event', [
    ['round_trip_us', 'µs'],
  ]),
  workers: group<WorkerResult>('workers', [
    ['round_trip_ms', 'ms'],
    ['perf_now', 'ms'],
  ]),
  animation: group<Animation>('anim', [
    ['timeline_current', 'ms'],
    ['raf_ts', 'ms'],
  ]),
  audio: group<Audio>('audio', [
    ['current_time', 's'],
    ['sample_rate', 'Hz'],
    ['base_latency', 's'],
    ['output_latency', 's'],
  ]),
  highPrecision: group<HighPrecision>('hiprec', [
    ['has_sab', ''],
    ['has_atomics', ''],
    ['wait_1ms_now', 'ms'],
    ['wait_1ms_date', 'ms'],
    ['waitasync_5ms', 'ms'],
  ]),
  network: group<Network>('net', [
    ['rtt_ms', 'ms'],
    ['effective_type', ''],
  ]),
  fetch: group<FetchTiming>('net', [['round_trip_ms', 'ms', 'fetch_round_trip_ms']]),
};

export const READPIXEL_FIELDS = [
  ['ms', 'ms'],
  ['mpx', 'MP'],
] as const satisfies MetricFields<NonNullable<NonNullable<GPUResults['readpixels']>[number]>>;
export const PERF_SAMPLE_FIELDS = [
  ['now', 'ms'],
  ['measure', 'ms'],
  ['date', 'ms'],
  ['startAt', 'ms'],
] as const satisfies MetricFields<PerfMeasurement>;
export const PERF_WORKLOADS = [
  'ctx_webgl_create',
  'shader_simple_10x',
  'shader_sdf_compile',
  'draw_1000_flush',
  'draw_1000_noflush',
  'readpixels_5x',
  'c2d_fillrect_500',
  'c2d_getimagedata_5x',
  'c2d_todataurl_5x',
] as const;
export type PerfWorkload = (typeof PERF_WORKLOADS)[number];

export const TIMEOUT_PROBES = [
  { field: 'set_timeout_0ms', delay: 0, samples: 7, unit: 'ms' },
  { field: 'set_timeout_1ms', delay: 1, samples: 5, unit: 'ms' },
  { field: 'set_timeout_4ms', delay: 4, samples: 5, unit: 'ms' },
] as const;

const fixedUnits = new Map<string, MetricUnit>();
for (const [namespace, groups] of [
  ['bench', GPU_METRICS],
  ['timing', TIMING_METRICS],
] as const) {
  for (const definition of Object.values(groups)) {
    for (const [field, unit, name = field] of definition.fields) {
      fixedUnits.set(`${namespace}.${definition.prefix}.${name}`, unit);
    }
  }
}
for (const probe of TIMEOUT_PROBES) fixedUnits.set(`timing.sched.${probe.field}`, probe.unit);
const readpixelUnits = new Map<string, MetricUnit>(READPIXEL_FIELDS);
const performanceUnits = new Map<string, MetricUnit>(PERF_SAMPLE_FIELDS);
const workloads: ReadonlySet<string> = new Set(PERF_WORKLOADS);
const suffixUnits: ReadonlyMap<string, MetricUnit> = new Map([
  ['ms', 'ms'],
  ['us', 'µs'],
  ['ns', 'ns'],
]);

function dynamicGPUUnit(key: string): MetricUnit | undefined {
  const readpixels = /^bench\.readpixels\.\d+\.(\w+)$/.exec(key);
  if (readpixels) return readpixelUnits.get(readpixels[1]!);
  const perf = /^bench\.perf\.([^.]+)\.(\w+)$/.exec(key);
  if (perf && workloads.has(perf[1]!)) return performanceUnits.get(perf[2]!);
  return undefined;
}

/** These extensible result families explicitly encode units; other names are never guessed. */
function timingSuffixUnit(key: string): MetricUnit | undefined {
  const suffix =
    /^timing\.(?:overhead|sched)\.[^.]+_(ms|us|ns)$/.exec(key)?.[1] ??
    /^timing\.gputimers\.webgl[12](?:_|\.)(ms|us|ns)$/.exec(key)?.[1];
  if (!suffix) return undefined;
  return suffixUnits.get(suffix);
}

/** Sparse lookup: undefined means the measurement contract does not declare a unit. */
export function measurementUnit(key: string): MetricUnit | undefined {
  return fixedUnits.get(key) ?? dynamicGPUUnit(key) ?? timingSuffixUnit(key);
}
