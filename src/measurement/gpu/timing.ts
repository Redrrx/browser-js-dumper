/// <reference types="vite/client" />
import TimingWorker from './timing.worker?worker&inline';
import { workerRequest } from './worker-rpc';
import type { WorkerResult } from './timing-types';
import { BENCH_VS, BENCH_FS } from './scenes';
import { TIMEOUT_PROBES } from './metric-fields';
import type { PerfWorkload } from './metric-fields';
import type { Resources } from './resources';
import { benchMkProg, context2D, YIELD, must, nextFrame } from './resources';
import type {
  PerfResults,
  PerfMeasurement,
  TimingResults,
  Clocks,
  Overhead,
  Entries,
  Events,
  Workers,
  Animation,
  Audio,
  Schedule,
  GPUTimers,
  GPUTimer,
  HighPrecision,
  Network,
  ExtendedPerformance,
  ExtendedWindow,
  ExtendedNavigator,
  ExtendedAtomics,
  ExtendedGlobal,
  WebGLQueryEXT,
  WebGL1TimerExtension,
  WebGL2TimerExtension,
} from './timing-types';

export async function benchPerfTimings(scope: Resources) {
  const r: PerfResults = {};

  const hasSAB = typeof SharedArrayBuffer !== 'undefined' && typeof Atomics !== 'undefined';

  r._nowTick = minTick(() => performance.now());
  r._dateTick = minTick(() => Date.now());
  r._origin = performance.timeOrigin;
  r._hasSAB = hasSAB;
  r._crossOriginIsolated = !!self.crossOriginIsolated;

  const N_NOW = 2000;
  const t_now0 = performance.now();
  for (let i = 0; i < N_NOW; i++) performance.now();
  r._nowCallUs = ((performance.now() - t_now0) / N_NOW) * 1000;

  const N_MK = 500;
  const t_mk0 = performance.now();
  for (let i = 0; i < N_MK; i++) {
    performance.mark('_boh');
    performance.clearMarks('_boh');
  }
  r._markCallUs = ((performance.now() - t_mk0) / N_MK) * 1000;

  const N_MS = 200;
  const t_ms0 = performance.now();
  for (let i = 0; i < N_MS; i++) {
    performance.mark('_bms');
    performance.mark('_bme');
    performance.measure('_bmm', '_bms', '_bme');
    performance.clearMarks('_bms');
    performance.clearMarks('_bme');
    performance.clearMeasures('_bmm');
  }
  r._measureCallUs = ((performance.now() - t_ms0) / N_MS) * 1000;

  const N_GE = 50;
  const t_ge0 = performance.now();
  for (let i = 0; i < N_GE; i++) performance.getEntries();
  r._getEntriesUs = ((performance.now() - t_ge0) / N_GE) * 1000;

  if (typeof (performance as ExtendedPerformance).eventCounts !== 'undefined') {
    r._eventCounts = {};
    try {
      for (const [k, v] of (performance as ExtendedPerformance).eventCounts!) r._eventCounts[k] = v;
    } catch (error) {
      console.warn('Performance event counts could not be read', error);
    }
  }

  try {
    const nav = performance.getEntriesByType('navigation')[0] as
      PerformanceNavigationTiming | undefined;
    if (nav)
      r._nav = {
        type: nav.type,
        redirectTime: nav.redirectEnd - nav.redirectStart,
        dnsTime: nav.domainLookupEnd - nav.domainLookupStart,
        connectTime: nav.connectEnd - nav.connectStart,
        ttfb: nav.responseStart - nav.requestStart,
        responseTime: nav.responseEnd - nav.responseStart,
        domParsing: nav.domInteractive - nav.responseEnd,
        domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
        loadEvent: nav.loadEventEnd - nav.loadEventStart,
        totalLoad: nav.loadEventEnd - nav.fetchStart,
      };
  } catch (error) {
    console.warn('Navigation timings could not be read', error);
  }

  try {
    r._paint = {};
    for (const e of performance.getEntriesByType('paint')) r._paint[e.name] = e.startTime;
  } catch (error) {
    console.warn('Paint timings could not be read', error);
  }

  if (hasSAB) {
    const sab = new Int32Array(new SharedArrayBuffer(4));
    const n0 = performance.now();
    const d0 = Date.now();
    try {
      Atomics.wait(sab, 0, 0, 10);
      r._atomics10 = { now: performance.now() - n0, date: Date.now() - d0 };
    } catch (error) {
      r._atomics10_error = String(error);
    }
  }

  const T = (name: PerfWorkload, fn: () => void) => {
    const ms = 'b_' + name + '_s';
    const me = 'b_' + name + '_e';
    const mm = 'b_' + name;
    const t0n = performance.now();
    const t0d = Date.now();
    performance.mark(ms);
    fn();
    const t1n = performance.now();
    const t1d = Date.now();
    performance.mark(me);
    const ent = performance.measure(mm, ms, me);
    const marksS = performance.getEntriesByName(ms, 'mark');
    const marksE = performance.getEntriesByName(me, 'mark');
    r[name] = {
      now: t1n - t0n,
      measure: ent.duration,
      date: t1d - t0d,
      startAt: ent.startTime,
      markDelta: null,
    };
    if (marksE.length && marksS.length) {
      (r[name] as PerfMeasurement).markDelta = marksE[0]!.startTime - marksS[0]!.startTime;
    }
    try {
      performance.clearMarks(ms);
      performance.clearMarks(me);
      performance.clearMeasures(mm);
    } catch (error) {
      console.warn('Performance marks could not be cleared', error);
    }
  };

  probePerfWebGL(scope, T);
  probePerfCanvas(scope, T);

  await YIELD();
  return r;
}

function minTick(fn: () => number) {
  let mn = Infinity;
  let p = fn();
  for (let i = 0; i < 500; i++) {
    const n = fn();
    if (n !== p) {
      if (n - p < mn) mn = n - p;
      p = n;
    }
  }
  if (mn === Infinity) return null;
  return mn;
}

function probeClocks(): Clocks {
  const clocks: Clocks = {};
  clocks.perf_now_tick = minTick(() => performance.now());
  clocks.perf_now_val = performance.now();
  clocks.date_now_tick = minTick(() => Date.now());
  clocks.date_now_val = Date.now();
  clocks.new_date_gettime_tick = minTick(() => new Date().getTime());
  clocks.new_date_valueof_tick = minTick(() => new Date().valueOf());
  clocks.time_origin = performance.timeOrigin;
  clocks.cross_origin_isolated = !!self.crossOriginIsolated;
  clocks.has_sab = typeof SharedArrayBuffer !== 'undefined' && typeof Atomics !== 'undefined';
  try {
    if (performance.timing) {
      clocks.timing_nav_start = performance.timing.navigationStart;
      clocks.timing_response_end = performance.timing.responseEnd;
      clocks.timing_dom_complete = performance.timing.domComplete;
      clocks.timing_load_end = performance.timing.loadEventEnd;
    }
  } catch (error) {
    console.warn('Legacy navigation timings could not be read', error);
  }
  return clocks;
}

function probeOverhead(): Overhead {
  const oh: Overhead = {};
  const N = 2000;
  let t0 = performance.now();
  for (let i = 0; i < N; i++) performance.now();
  oh.perf_now_us = ((performance.now() - t0) / N) * 1000;

  t0 = performance.now();
  for (let i = 0; i < N; i++) Date.now();
  oh.date_now_us = ((performance.now() - t0) / N) * 1000;

  t0 = performance.now();
  for (let i = 0; i < N; i++) new Date().getTime();
  oh.new_date_us = ((performance.now() - t0) / N) * 1000;

  const Nmk = 500;
  t0 = performance.now();
  for (let i = 0; i < Nmk; i++) {
    performance.mark('_bt');
    performance.clearMarks('_bt');
  }
  oh.mark_us = ((performance.now() - t0) / Nmk) * 1000;

  const Nms = 200;
  t0 = performance.now();
  for (let i = 0; i < Nms; i++) {
    performance.mark('_bts');
    performance.mark('_bte');
    performance.measure('_btm', '_bts', '_bte');
    performance.clearMarks('_bts');
    performance.clearMarks('_bte');
    performance.clearMeasures('_btm');
  }
  oh.measure_us = ((performance.now() - t0) / Nms) * 1000;

  const Nge = 50;
  t0 = performance.now();
  for (let i = 0; i < Nge; i++) performance.getEntries();
  oh.get_entries_us = ((performance.now() - t0) / Nge) * 1000;

  t0 = performance.now();
  for (let i = 0; i < Nge; i++) performance.getEntriesByType('resource');
  oh.get_entries_by_type_us = ((performance.now() - t0) / Nge) * 1000;
  return oh;
}

async function probeEntries(): Promise<Entries> {
  const ents: Entries = {};
  try {
    ents.entry_count = performance.getEntries().length;
  } catch (error) {
    console.warn('Performance entry count unavailable', error);
  }
  try {
    ents.resource_count = performance.getEntriesByType('resource').length;
  } catch (error) {
    console.warn('Resource entry count unavailable', error);
  }
  try {
    ents.navigation_count = performance.getEntriesByType('navigation').length;
  } catch (error) {
    console.warn('Navigation entry count unavailable', error);
  }
  try {
    ents.paint = {};
    for (const e of performance.getEntriesByType('paint')) ents.paint[e.name] = e.startTime;
  } catch (error) {
    console.warn('Paint entries could not be read', error);
  }
  ents.lcp_ts = await new Promise((res) => {
    try {
      const obs = new PerformanceObserver((list) => {
        const es = list.getEntries();
        if (es.length) {
          obs.disconnect();
          res(es[es.length - 1]!.startTime);
        }
      });
      obs.observe({ type: 'largest-contentful-paint', buffered: true });
      setTimeout(() => {
        try {
          obs.disconnect();
        } catch (error) {
          console.warn('LCP observer could not be disconnected', error);
        }
        res(null);
      }, 150);
    } catch {
      res(null);
    }
  });
  if (typeof (performance as ExtendedPerformance).eventCounts !== 'undefined') {
    try {
      ents.event_counts_total = 0;
      for (const [, v] of (performance as ExtendedPerformance).eventCounts!)
        ents.event_counts_total += v;
    } catch (error) {
      console.warn('Performance event count total is incomplete', error);
    }
  }
  try {
    if (PerformanceObserver.supportedEntryTypes)
      ents.observer_types = [...PerformanceObserver.supportedEntryTypes];
  } catch (error) {
    console.warn('Supported observer entry types unavailable', error);
  }
  return ents;
}

async function probeEvents(): Promise<Events> {
  const evts: Events = {};
  try {
    let ts: number | null = null;
    const el = document.createElement('div');
    el.addEventListener('click', (e) => {
      ts = e.timeStamp;
    });
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    if (ts !== null) {
      evts.mouse_event_ts = ts;
      evts.mouse_delta_now = performance.now() - ts;
    }
  } catch (error) {
    console.warn('Mouse event timestamp unavailable', error);
  }
  try {
    let ts: number | null = null;
    const el = document.createElement('div');
    el.addEventListener('pointerdown', (e) => {
      ts = e.timeStamp;
    });
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    if (ts !== null) evts.pointer_event_ts = ts;
  } catch (error) {
    console.warn('Pointer event timestamp unavailable', error);
  }
  try {
    let ts: number | null = null;
    const el = document.createElement('div');
    el.addEventListener(
      'keydown',
      (e) => {
        ts = e.timeStamp;
      },
      { once: true },
    );
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    if (ts !== null) evts.keyboard_event_ts = ts;
  } catch (error) {
    console.warn('Keyboard event timestamp unavailable', error);
  }
  evts.message_event = await new Promise((res) => {
    try {
      const ch = new MessageChannel();
      const t_pre = performance.now();
      ch.port1.onmessage = (e) => {
        res({ ts: e.timeStamp, round_trip_us: (performance.now() - t_pre) * 1000 });
        ch.port1.close();
        ch.port2.close();
      };
      ch.port2.start();
      ch.port2.postMessage('ping');
    } catch {
      res(null);
    }
  });
  {
    let target: HTMLDivElement | undefined;
    let observer: IntersectionObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      let ioTime: number | null = null;
      target = document.createElement('div');
      target.style.cssText = 'position:fixed;width:1px;height:1px;top:0;left:0';
      document.body.appendChild(target);
      await new Promise<void>((res) => {
        observer = new IntersectionObserver((entries) => {
          if (entries.length) ioTime = entries[0]!.time;
          observer?.disconnect();
          res();
        });
        observer.observe(target!);
        timer = setTimeout(res, 100);
      });
      if (ioTime !== null) evts.intersection_observer_ts = ioTime;
    } catch {
      /* Observer is optional. */
    } finally {
      clearTimeout(timer);
      observer?.disconnect();
      target?.remove();
    }
  }
  return evts;
}

async function probeWorkers(): Promise<Workers> {
  const wrk: Workers = {};
  if (location.protocol === 'file:') {
    wrk.worker_result = { error: 'n/a on file://' };
  } else {
    try {
      let t0 = 0;
      const response = await workerRequest<WorkerResult>(
        () => {
          const worker = new TimingWorker();
          t0 = performance.now();
          return worker;
        },
        'go',
        2000,
      );
      wrk.worker_result = { ...response, round_trip_ms: performance.now() - t0 };
    } catch (error) {
      wrk.worker_result = { error: String(error) };
    }
  }
  wrk.service_worker_available = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  return wrk;
}

async function probeAnimation(): Promise<Animation> {
  const anim: Animation = {};
  try {
    anim.timeline_current = null;
    if (typeof document.timeline.currentTime === 'number')
      anim.timeline_current = document.timeline.currentTime;
  } catch (error) {
    console.warn('Animation timeline unavailable', error);
  }
  try {
    anim.raf_ts = await nextFrame();
  } catch {
    anim.raf_ts = null;
  }
  if (anim.raf_ts != null && anim.timeline_current != null)
    anim.raf_delta_timeline = anim.raf_ts - anim.timeline_current;
  return anim;
}

async function probeAudio(): Promise<Audio> {
  const aud: Audio = {};
  let audioContext: AudioContext | undefined;
  try {
    const ctx = (audioContext = new (
      window.AudioContext || (window as ExtendedWindow).webkitAudioContext!
    )());
    aud.state = ctx.state;
    aud.sample_rate = ctx.sampleRate;
    aud.current_time = ctx.currentTime;
    aud.base_latency = ctx.baseLatency ?? null;
    aud.output_latency = ctx.outputLatency ?? null;
    if (typeof ctx.getOutputTimestamp === 'function') {
      try {
        const ts = ctx.getOutputTimestamp();
        aud.output_ts_context_time = ts.contextTime ?? null;
        aud.output_ts_perf_time = ts.performanceTime ?? null;
      } catch (error) {
        console.warn('Audio output timestamp unavailable', error);
      }
    }
  } catch (e) {
    aud.error = String(e);
  } finally {
    try {
      await audioContext?.close();
    } catch {
      /* Closing a suspended/unsupported context may reject. */
    }
  }
  return aud;
}

async function probeSchedule(): Promise<Schedule> {
  const sched: Schedule = {};
  const measureTimeout = (delay: number, n: number) =>
    new Promise<number>((res2) => {
      const times: number[] = [];
      let i = 0;
      const step = () => {
        const t = performance.now();
        setTimeout(() => {
          times.push(performance.now() - t);
          if (++i < n) step();
          else {
            times.sort((a, b) => a - b);
            res2(times[Math.floor(n / 2)]!);
          }
        }, delay);
      };
      step();
    });
  for (const probe of TIMEOUT_PROBES) {
    sched[probe.field] = await measureTimeout(probe.delay, probe.samples);
  }

  sched.microtask_us = await new Promise((res2) => {
    try {
      const t = performance.now();
      queueMicrotask(() => res2((performance.now() - t) * 1000));
    } catch {
      res2(null);
    }
  });
  sched.promise_then_us = await new Promise((res2) => {
    const t = performance.now();
    Promise.resolve().then(() => res2((performance.now() - t) * 1000));
  });
  sched.idle_callback_ms = await new Promise((res2) => {
    if (typeof requestIdleCallback === 'undefined') {
      res2(null);
      return;
    }
    const t = performance.now();
    requestIdleCallback(() => res2(performance.now() - t), { timeout: 500 });
  });
  sched.scheduler_post_task_ms = await (async () => {
    const scheduler = (globalThis as ExtendedGlobal).scheduler;
    if (typeof scheduler === 'undefined' || typeof scheduler.postTask !== 'function') return null;
    try {
      const t = performance.now();
      await scheduler.postTask(() => undefined, { priority: 'user-visible' });
      return performance.now() - t;
    } catch {
      return null;
    }
  })();
  return sched;
}

async function probeGPUTimers(scope: Resources): Promise<GPUTimers> {
  const gput: GPUTimers = {};
  gput.webgl1 = await probeWebGL1Timer(scope);
  gput.webgl2 = await probeWebGL2Timer(scope);
  return gput;
}

async function probeHighPrecision(): Promise<HighPrecision> {
  const hiprec: HighPrecision = {};
  hiprec.has_sab = typeof SharedArrayBuffer !== 'undefined';
  hiprec.has_atomics = typeof Atomics !== 'undefined';
  hiprec.has_waitasync =
    typeof Atomics !== 'undefined' && typeof (Atomics as ExtendedAtomics).waitAsync === 'function';
  if (hiprec.has_sab && hiprec.has_atomics) {
    try {
      const sab = new Int32Array(new SharedArrayBuffer(4));
      const t0n = performance.now();
      const t0d = Date.now();
      Atomics.wait(sab, 0, 0, 1);
      hiprec.wait_1ms_now = performance.now() - t0n;
      hiprec.wait_1ms_date = Date.now() - t0d;
    } catch (e) {
      hiprec.wait_note = String(e);
    }
    if (hiprec.has_waitasync) {
      hiprec.waitasync_5ms = await new Promise((res2) => {
        try {
          const sab2 = new Int32Array(new SharedArrayBuffer(4));
          const t0 = performance.now();
          const result = (Atomics as ExtendedAtomics).waitAsync!(sab2, 0, 0, 5);
          if (result.async) result.value.then(() => res2(performance.now() - t0));
          else res2(null);
        } catch {
          res2(null);
        }
      });
    }
  } else {
    hiprec.note = 'SAB/Atomics blocked (requires COOP+COEP headers)';
  }
  return hiprec;
}

async function probeNetwork(): Promise<Network> {
  const net: Network = {};
  try {
    if ((navigator as ExtendedNavigator).connection) {
      net.rtt_ms = (navigator as ExtendedNavigator).connection!.rtt;
      net.effective_type = (navigator as ExtendedNavigator).connection!.effectiveType;
      net.downlink_mbps = (navigator as ExtendedNavigator).connection!.downlink;
    } else {
      net.connection_note = '(navigator as ExtendedNavigator).connection unavailable';
    }
  } catch (error) {
    console.warn('Network connection information unavailable', error);
  }
  net.fetch_timing = await new Promise((res2) => {
    const tryFetch = (url: string, mode?: RequestMode) => {
      const t0 = performance.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      fetch(url, {
        method: 'HEAD',
        cache: 'no-store',
        mode: mode || 'no-cors',
        signal: controller.signal,
      })
        .then(() => {
          const t1 = performance.now();
          const entries = performance.getEntriesByName(url, 'resource');
          const entry = entries[entries.length - 1] as PerformanceResourceTiming | undefined;
          if (entry && entry.responseStart > 0) {
            res2({
              duration_ms: entry.duration,
              ttfb_ms: entry.responseStart - entry.requestStart,
              round_trip_ms: t1 - t0,
            });
          } else {
            res2({ round_trip_ms: t1 - t0 });
          }
        })
        .catch(() => res2(null))
        .finally(() => clearTimeout(timer));
    };
    try {
      const sameOrigin = location.protocol === 'http:' || location.protocol === 'https:';
      if (sameOrigin) {
        tryFetch(location.href, 'same-origin');
      } else res2(null);
    } catch {
      res2(null);
    }
  });
  return net;
}

export async function runTimingBenchmark(scope: Resources, onProgress?: (message: string) => void) {
  const r: TimingResults = {};
  onProgress?.('clocks…');
  r.clocks = probeClocks();
  onProgress?.('oh…');
  r.overhead = probeOverhead();
  onProgress?.('ents…');
  r.entries = await probeEntries();
  onProgress?.('evts…');
  r.events = await probeEvents();
  onProgress?.('wrk…');
  r.workers = await probeWorkers();
  onProgress?.('anim…');
  r.anim = await probeAnimation();
  onProgress?.('aud…');
  r.audio = await probeAudio();
  onProgress?.('sched…');
  r.sched = await probeSchedule();
  onProgress?.('gput…');
  r.gputimers = await probeGPUTimers(scope);
  onProgress?.('hiprec…');
  r.hiprec = await probeHighPrecision();
  onProgress?.('net…');
  r.net = await probeNetwork();
  return r;
}

async function probeWebGL1Timer(scope: Resources): Promise<GPUTimer> {
  const result: GPUTimer = {};
  let gl: WebGLRenderingContext | null = null;
  let ext: WebGL1TimerExtension | null = null;
  let query: WebGLQueryEXT | null = null;
  try {
    const canvas = Object.assign(scope.canvas(), { width: 1, height: 1 });
    gl = scope.gl(canvas, 'webgl');
    if (!gl) {
      result.available = false;
      result.note = 'no webgl';
      return result;
    }
    ext = gl.getExtension('EXT_disjoint_timer_query') as WebGL1TimerExtension | null;
    if (!ext) {
      result.available = false;
      return result;
    }
    result.available = true;
    query = ext.createQueryEXT();
    if (!query) throw new Error('GPU timer query allocation failed');
    ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, query);
    gl.clear(gl.COLOR_BUFFER_BIT);
    ext.endQueryEXT(ext.TIME_ELAPSED_EXT);
    await new Promise((resolve) => setTimeout(resolve, 30));
    const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
    const available = ext.getQueryObjectEXT(query, ext.QUERY_RESULT_AVAILABLE_EXT);
    if (!disjoint && available) {
      const ns = ext.getQueryObjectEXT(query, ext.QUERY_RESULT_EXT);
      result.ns = ns;
      result.us = ns / 1000;
    } else if (disjoint) {
      result.note = 'disjoint';
    } else {
      result.note = 'result not ready';
    }
  } catch (error) {
    result.error = String(error);
  } finally {
    try {
      if (ext && query) ext.deleteQueryEXT(query);
    } catch (error) {
      result.error = String(error);
    }
  }
  return result;
}

async function probeWebGL2Timer(scope: Resources): Promise<GPUTimer> {
  const result: GPUTimer = {};
  let gl: WebGL2RenderingContext | null = null;
  let ext: WebGL2TimerExtension | null = null;
  let query: WebGLQuery | null = null;
  try {
    const canvas = Object.assign(scope.canvas(), { width: 1, height: 1 });
    gl = scope.gl(canvas, 'webgl2');
    if (!gl) {
      result.available = false;
      result.note = 'no webgl2';
      return result;
    }
    ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as WebGL2TimerExtension | null;
    if (!ext) {
      result.available = false;
      return result;
    }
    result.available = true;
    query = gl.createQuery();
    if (!query) throw new Error('GPU timer query allocation failed');
    gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.endQuery(ext.TIME_ELAPSED_EXT);
    await new Promise((resolve) => setTimeout(resolve, 30));
    const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
    const available = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
    if (!disjoint && available) {
      const ns = gl.getQueryParameter(query, gl.QUERY_RESULT);
      result.ns = ns;
      result.us = ns / 1000;
    } else if (disjoint) {
      result.note = 'disjoint';
    } else {
      result.note = 'result not ready';
    }
  } catch (error) {
    result.error = String(error);
  } finally {
    try {
      if (gl && query) gl.deleteQuery(query);
    } catch (error) {
      result.error = String(error);
    }
  }
  return result;
}

type PerfTimer = (name: PerfWorkload, operation: () => void) => void;

function probePerfWebGL(scope: Resources, T: PerfTimer) {
  const c = scope.canvas();
  c.width = 256;
  c.height = 256;
  T('ctx_webgl_create', () => scope.gl(c, 'webgl'));
  const gl = scope.gl(c, 'webgl');

  if (gl) {
    const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const FSs = 'precision mediump float;void main(){gl_FragColor=vec4(0.5);}';
    T('shader_simple_10x', () => {
      for (let i = 0; i < 10; i++) {
        const v = must(gl.createShader(gl.VERTEX_SHADER));
        gl.shaderSource(v, VS);
        gl.compileShader(v);
        const f = must(gl.createShader(gl.FRAGMENT_SHADER));
        gl.shaderSource(f, FSs);
        gl.compileShader(f);
        const p = must(gl.createProgram());
        gl.attachShader(p, v);
        gl.attachShader(p, f);
        gl.linkProgram(p);
        gl.deleteProgram(p);
        gl.deleteShader(v);
        gl.deleteShader(f);
      }
    });
    T('shader_sdf_compile', () => {
      const v = must(gl.createShader(gl.VERTEX_SHADER));
      gl.shaderSource(v, BENCH_VS);
      gl.compileShader(v);
      const f = must(gl.createShader(gl.FRAGMENT_SHADER));
      gl.shaderSource(f, BENCH_FS);
      gl.compileShader(f);
      const p = must(gl.createProgram());
      gl.attachShader(p, v);
      gl.attachShader(p, f);
      gl.linkProgram(p);
      gl.deleteProgram(p);
      gl.deleteShader(v);
      gl.deleteShader(f);
    });
    const prog = benchMkProg(gl, VS, FSs);
    if (prog) {
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const pl = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(pl);
      gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
      T('draw_1000_flush', () => {
        for (let i = 0; i < 1000; i++) gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.finish();
      });
      T('draw_1000_noflush', () => {
        for (let i = 0; i < 1000; i++) gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      });
      const rpBuf = new Uint8Array(256 * 256 * 4);
      T('readpixels_5x', () => {
        for (let i = 0; i < 5; i++) gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.UNSIGNED_BYTE, rpBuf);
      });
    }
  }
}

function probePerfCanvas(scope: Resources, T: PerfTimer) {
  const c2 = scope.canvas();
  c2.width = 256;
  c2.height = 256;
  const ctx = context2D(c2);
  T('c2d_fillrect_500', () => {
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = 'rgb(' + (i % 256) + ',' + ((i * 3) % 256) + ',' + ((i * 7) % 256) + ')';
      ctx.fillRect(i % 200, i % 200, 40, 40);
    }
  });
  T('c2d_getimagedata_5x', () => {
    for (let i = 0; i < 5; i++) ctx.getImageData(0, 0, 256, 256);
  });
  T('c2d_todataurl_5x', () => {
    for (let i = 0; i < 5; i++) c2.toDataURL('image/png');
  });
}
