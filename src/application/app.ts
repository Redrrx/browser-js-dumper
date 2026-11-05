import { createStore } from 'zustand/vanilla';
import { z } from 'zod';
import { scanAll } from '../measurement/scan';
import type { ScanMap, ScanEntry } from '../measurement/scan';
import { runGPU, runTiming, gpuToEntries, timingToEntries } from '../measurement/gpu';
import type { AnalysisConfig, GPUResults, SceneImages, TimingResults } from '../measurement/gpu';
import { loadConfig, saveConfig, validateConfig } from './config';
import { runVendorDetection, waitForVendorDetection } from './vendor-detection';

export { validateConfig } from './config';

export type View = 'scan' | 'gpu' | 'timing';
export interface GPUCapture {
  results: GPUResults;
  images: SceneImages;
}
export interface AppState {
  view: View;
  current: ScanMap | null;
  imported: ScanMap | null;
  config: AnalysisConfig;
  gpu: GPUCapture | null;
  timing: TimingResults | null;
  busy: boolean;
  status: string;
  error: string | null;
}

export const appStore = createStore<AppState>(() => ({
  view: 'scan',
  current: null,
  imported: null,
  config: loadConfig(),
  gpu: null,
  timing: null,
  busy: false,
  status: 'Ready',
  error: null,
}));
export function selectView(view: View) {
  appStore.setState({ view });
}
export function applyConfig(value: AnalysisConfig) {
  const config = validateConfig(value);
  appStore.setState({ config });
  try {
    saveConfig(config);
  } catch {
    appStore.setState({
      error: 'Configuration applied for this session, but browser storage is unavailable.',
    });
  }
}

const entrySchema = z
  .object({ type: z.string().max(100), display: z.string().max(100_000) })
  .passthrough();
export function importEnvironment(text: string) {
  if (text.length > 32 * 1024 * 1024) throw new Error('Import is limited to 32 MiB');
  const root = z.record(z.string(), z.unknown()).parse(JSON.parse(text) as unknown);
  let source = root;
  if (root.env !== undefined) source = z.record(z.string(), z.unknown()).parse(root.env);
  const entries: [string, ScanEntry][] = [];
  for (const [key, value] of Object.entries(source)) {
    if (key.startsWith('__')) continue;
    const entry = entrySchema.parse(value);
    if (entry.type === 'number') {
      entry.type = 'float';
      if (Number.isInteger(Number.parseFloat(entry.display))) entry.type = 'integer';
    }
    entries.push([key, entry]);
  }
  appStore.setState({ imported: new Map(entries), error: null });
}
export function detectBrowser() {
  const ua = navigator.userAgent;
  for (const [expression, name] of [
    [/Edg\/([\d]+)/, 'Edge'],
    [/OPR\/([\d]+)/, 'Opera'],
    [/Chrome\/([\d]+)/, 'Chrome'],
    [/Firefox\/([\d]+)/, 'Firefox'],
    [/Version\/([\d]+).*Safari\//, 'Safari'],
  ] as const) {
    const match = ua.match(expression);
    if (match) return name + ' ' + (match[1] ?? '?');
  }
  return 'Browser';
}
const meta = (mode: string) => ({
  browser: detectBrowser(),
  ua: navigator.userAgent,
  ts: Date.now(),
  mode,
});
const progress = (status: string) => appStore.setState({ status });
export function reportError(error: unknown) {
  if (error instanceof Error) {
    appStore.setState({ error: error.message });
    return;
  }
  appStore.setState({ error: String(error) });
}

let vendorRequested = false;
async function runRequestedVendorDetection() {
  await waitForVendorDetection();
  if (!vendorRequested || appStore.getState().busy) return;
  vendorRequested = false;
  await runVendorDetection();
}

export function retryVendorDetection() {
  if (appStore.getState().busy) return;
  return runVendorDetection();
}

async function exclusive<T>(operation: () => Promise<T>): Promise<T> {
  if (appStore.getState().busy)
    throw Object.assign(new Error('Analysis is busy; wait for the active run to finish.'), {
      code: 'BUSY',
    });
  appStore.setState({ busy: true, error: null });
  try {
    const result = await operation();
    appStore.setState({ status: 'Done' });
    return result;
  } catch (error) {
    reportError(error);
    appStore.setState({ status: 'Failed' });
    throw error;
  } finally {
    appStore.setState({ busy: false });
    if (vendorRequested) void runRequestedVendorDetection();
  }
}
async function captureScan() {
  const current = await scanAll((namespace, count) =>
    progress(`Scanning ${namespace} · ${count.toLocaleString()} entries`),
  );
  appStore.setState({ current });
  return { browser: detectBrowser(), count: current.size };
}
async function captureGPU() {
  const gpu = await runGPU(appStore.getState().config, progress);
  appStore.setState({ gpu });
  vendorRequested = true;
  return exportGPU();
}
async function captureTiming() {
  const timing = await runTiming(progress);
  appStore.setState({ timing });
  return exportTiming();
}
export function exportGPU() {
  const gpu = appStore.getState().gpu;
  if (!gpu) return { error: 'GPU analysis unavailable' };
  return {
    __meta__: meta('benchmark'),
    __images__: gpu.images,
    ...Object.fromEntries(gpuToEntries(gpu.results)),
  };
}
export function exportTiming() {
  const timing = appStore.getState().timing;
  if (!timing) return { __meta__: meta('timing') };
  return {
    __meta__: meta('timing'),
    ...Object.fromEntries(timingToEntries(timing)),
  };
}
export function exportAll() {
  const { current, gpu, timing } = appStore.getState();
  return {
    __meta__: meta('all'),
    env: current && Object.fromEntries(current),
    gpu: gpu && { __images__: gpu.images, ...Object.fromEntries(gpuToEntries(gpu.results)) },
    timing: timing && Object.fromEntries(timingToEntries(timing)),
  };
}
function downloadJSON(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export interface QueryOptions {
  category?: string | null;
  search?: string;
  types?: string[] | null;
  page?: number;
  pageSize?: number;
}
export const BJSD = {
  version: 1,
  help() {
    return {
      scan: 'await BJSD.scan() -> {browser,count}  (window + activators + css probe)',
      categories: 'BJSD.categories() -> [{category,count}]',
      query:
        'BJSD.query({category,search,types:[..],page,pageSize=1000}) -> {total,page,pages,entries}',
      env: 'BJSD.env() -> full scan as JSON (download-equivalent)',
      runGPU: 'await BJSD.runGPU() -> GPU analysis JSON',
      runTiming: 'await BJSD.runTiming() -> timing analysis JSON',
      runAll: 'await BJSD.runAll() -> runs scan+gpu+timing, returns counts',
      dumpAll: 'await BJSD.dumpAll() -> {env,gpu,timing} one object',
      download: "BJSD.download('env'|'gpu'|'timing'|'all') -> triggers file download",
      autorun: 'open index.html?api=scan|gpu|timing|all ; await window.__bjsdReady',
    };
  },
  scan: () => exclusive(captureScan),
  categories() {
    const counts = new Map<string, number>();
    for (const path of appStore.getState().current?.keys() ?? []) {
      const category = path.split('.')[0] ?? path;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return [...counts]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  },
  query({
    category = null,
    search = '',
    types = null,
    page = 0,
    pageSize = 1000,
  }: QueryOptions = {}) {
    const { current } = appStore.getState();
    if (!current) return { error: 'not scanned — call BJSD.scan() first' };
    const q = String(search).toLowerCase();
    const typeSet = new Set(types ?? []);
    const entries = [...current]
      .filter(
        ([path, entry]) =>
          (!category || path.split('.')[0] === category) &&
          (!types || typeSet.has(entry.type)) &&
          (!q || (path + ' = ' + entry.display).toLowerCase().includes(q)),
      )
      .map(([path, { type, display }]) => ({ path, type, display }));
    return {
      total: entries.length,
      page,
      pageSize,
      pages: Math.ceil(entries.length / pageSize),
      entries: entries.slice(page * pageSize, (page + 1) * pageSize),
    };
  },
  env() {
    const { current } = appStore.getState();
    if (!current) return { error: 'not scanned' };
    return { __meta__: meta('env'), ...Object.fromEntries(current) };
  },
  runGPU: () => exclusive(captureGPU),
  runTiming: () => exclusive(captureTiming),
  runAll: () =>
    exclusive(async () => {
      const scan = await captureScan();
      await captureGPU();
      await captureTiming();
      return { scan, gpu: !!appStore.getState().gpu, timing: !!appStore.getState().timing };
    }),
  async dumpAll() {
    if (!appStore.getState().current) await BJSD.scan();
    return exportAll();
  },
  download(kind = 'env') {
    const { current, gpu, timing } = appStore.getState();
    if (kind === 'env' && !current) return { error: 'not scanned' };
    if (kind === 'gpu' && !gpu) return { error: 'no gpu results' };
    if (kind === 'timing' && !timing) return { error: 'no timing results' };
    if (!['env', 'gpu', 'timing', 'all'].includes(kind)) return { error: 'unknown kind: ' + kind };
    const payload = downloadPayload(kind);
    if (!payload) return { error: 'unknown kind: ' + kind };
    downloadJSON(
      `${payload.prefix}-${detectBrowser().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`,
      payload.value,
    );
    return { downloaded: kind };
  },
};
function downloadPayload(kind: string) {
  switch (kind) {
    case 'env':
      return { prefix: 'env', value: BJSD.env() };
    case 'gpu':
      return { prefix: 'bench', value: exportGPU() };
    case 'timing':
      return { prefix: 'timing', value: exportTiming() };
    case 'all':
      return { prefix: 'dump-all', value: exportAll() };
    default:
      return null;
  }
}

declare global {
  interface Window {
    BJSD: typeof BJSD;
    __bjsdReady?: Promise<boolean>;
  }
}
export function installAPI() {
  window.BJSD = BJSD;
  const mode = new URLSearchParams(location.search).get('api');
  if (mode) {
    window.__bjsdReady = exclusive(async () => {
      if (mode === 'scan' || mode === 'all') await captureScan();
      if (mode === 'gpu' || mode === 'all') await captureGPU();
      if (mode === 'timing' || mode === 'all') await captureTiming();
      return true;
    });
    void window.__bjsdReady.catch(() => undefined);
  }
}
