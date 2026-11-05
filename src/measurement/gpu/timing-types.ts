type Metrics = Record<string, number | string | boolean | null>;
export type Clocks = Metrics;
export type Overhead = Record<string, number>;
export interface Entries {
  entry_count?: number;
  resource_count?: number;
  navigation_count?: number;
  paint?: Record<string, number>;
  lcp_ts?: number | null;
  event_counts_total?: number;
  observer_types?: string[];
}
export interface Events {
  mouse_event_ts?: number;
  mouse_delta_now?: number;
  pointer_event_ts?: number;
  keyboard_event_ts?: number;
  message_event?: { ts: number; round_trip_us: number } | null;
  intersection_observer_ts?: number;
}
export interface WorkerResult {
  error?: string;
  perf_now?: number;
  date_now?: number;
  has_perf?: boolean;
  round_trip_ms?: number;
}
export interface Workers {
  worker_result?: WorkerResult;
  service_worker_available?: boolean;
}
export interface Animation {
  timeline_current?: number | null;
  raf_ts?: number | null;
  raf_delta_timeline?: number;
}
export type Audio = Metrics;
export type Schedule = Record<string, number | null>;
export interface GPUTimer {
  available?: boolean;
  note?: string;
  ns?: number;
  us?: number;
  error?: string;
}
export interface GPUTimers {
  webgl1?: GPUTimer;
  webgl2?: GPUTimer;
}
export type HighPrecision = Metrics;
export interface FetchTiming {
  duration_ms?: number;
  ttfb_ms?: number;
  round_trip_ms: number;
}
export interface Network {
  rtt_ms?: number;
  effective_type?: string;
  downlink_mbps?: number;
  connection_note?: string;
  fetch_timing?: FetchTiming | null;
}
export interface TimingResults {
  clocks?: Clocks;
  overhead?: Overhead;
  entries?: Entries;
  events?: Events;
  workers?: Workers;
  anim?: Animation;
  audio?: Audio;
  sched?: Schedule;
  gputimers?: GPUTimers;
  hiprec?: HighPrecision;
  net?: Network;
}
export interface PerfMeasurement {
  now: number;
  measure: number;
  date: number;
  startAt: number;
  markDelta: number | null;
}
export interface PerfResults {
  [key: string]:
    | number
    | boolean
    | string
    | null
    | Record<string, number | string>
    | PerfMeasurement
    | { now: number; date: number };
}
export interface ExtendedPerformance {
  eventCounts?: Iterable<[string, number]>;
}
export interface ExtendedWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}
export interface ExtendedNavigator extends Navigator {
  connection?: { rtt: number; effectiveType: string; downlink: number };
}
export interface ExtendedAtomics {
  waitAsync?: (
    array: Int32Array<SharedArrayBuffer>,
    index: number,
    value: number,
    timeout: number,
  ) => { async: false; value: string } | { async: true; value: Promise<string> };
}
export interface ExtendedGlobal {
  scheduler?: { postTask: (fn: () => void, options: { priority: string }) => Promise<void> };
}
// WebGL 1 extension queries are not WebGL 2 core query objects.
export interface WebGLQueryEXT {
  readonly __webglQueryEXT: unique symbol;
}
export interface WebGL2TimerExtension {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}
export interface WebGL1TimerExtension extends WebGL2TimerExtension {
  QUERY_RESULT_EXT: 0x8866;
  QUERY_RESULT_AVAILABLE_EXT: 0x8867;
  createQueryEXT(): WebGLQueryEXT | null;
  beginQueryEXT(target: number, query: WebGLQueryEXT): void;
  endQueryEXT(target: number): void;
  getQueryObjectEXT(query: WebGLQueryEXT, parameter: 0x8866): number;
  getQueryObjectEXT(query: WebGLQueryEXT, parameter: 0x8867): boolean;
  deleteQueryEXT(query: WebGLQueryEXT): void;
}
