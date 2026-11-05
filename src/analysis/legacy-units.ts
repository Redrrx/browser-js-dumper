import { PERF_WORKLOADS } from '../measurement/gpu/metric-fields';
import type { MetricUnit } from '../measurement/gpu/metric-fields';

// Accepted by the analysis/import format, but not projected by today's entry exporters.
const legacyUnits: ReadonlyMap<string, MetricUnit> = new Map([
  ['timing.clocks.perf_now_val', 'ms'],
  ['timing.clocks.date_now_val', 'ms'],
  ['timing.clocks.new_date_gettime_tick', 'ms'],
  ['timing.clocks.new_date_valueof_tick', 'ms'],
  ['timing.clocks.timing_nav_start', 'ms'],
  ['timing.clocks.timing_response_end', 'ms'],
  ['timing.clocks.timing_dom_complete', 'ms'],
  ['timing.clocks.timing_load_end', 'ms'],
  ['timing.events.mouse_delta_now', 'ms'],
  ['timing.events.message_event.ts', 'ms'],
  ['timing.events.intersection_observer_ts', 'ms'],
  ['timing.workers.date_now', 'ms'],
  ['timing.anim.raf_delta_timeline', 'ms'],
  ['timing.audio.output_ts_context_time', 's'],
  ['timing.audio.output_ts_perf_time', 'ms'],
  ['timing.net.fetch_timing.duration_ms', 'ms'],
  ['timing.net.fetch_timing.ttfb_ms', 'ms'],
  ['timing.net.fetch_timing.round_trip_ms', 'ms'],
  ['timing.net.downlink_mbps', 'Mbit/s'],
  ['bench.perf._nowCallUs', 'µs'],
  ['bench.perf._markCallUs', 'µs'],
  ['bench.perf._measureCallUs', 'µs'],
  ['bench.perf._getEntriesUs', 'µs'],
]);

export function legacyUnit(key: string): MetricUnit | undefined {
  const workload = /^bench\.perf\.([^.]+)\.markDelta$/.exec(key)?.[1];
  if (workload && PERF_WORKLOADS.some((name) => name === workload)) return 'ms';
  return legacyUnits.get(key);
}
