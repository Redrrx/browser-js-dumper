import type { LegacyEntry } from './types';
import type { RenderBackend, RenderSuiteReport } from './render-suite-types';

export function renderCaseKey(backend: RenderBackend, id: string) {
  return `bench.render.${backend}_v1.${id}`;
}
export function appendRenderingEntries(
  entries: Map<string, LegacyEntry>,
  backend: RenderBackend,
  report: RenderSuiteReport | null | undefined,
) {
  if (!report) return;
  const text = (key: string, display: string) => entries.set(key, { type: 'string', display });
  text(`bench.render.${backend}_v1.version`, `v${report.version}`);
  for (const [id, result] of Object.entries(report.cases)) {
    const key = renderCaseKey(backend, id);
    text(`${key}.status`, result.status);
    if (result.detail) text(`${key}.detail`, result.detail);
    if (result.hash) text(`${key}.hash`, result.hash);
    const metrics = {
      colored_pixels: result.coloredPixels,
      partial_alpha_pixels: result.partialAlphaPixels,
      colors: result.colors,
    };
    for (const [field, value] of Object.entries(metrics)) {
      if (value !== undefined)
        entries.set(`${key}.${field}`, { type: 'integer', display: String(value) });
    }
  }
}
