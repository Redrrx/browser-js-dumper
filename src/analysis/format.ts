import type { LegacyEntry } from '../measurement/gpu';
import { measurementUnit } from '../measurement/gpu/metric-fields';
import type { MetricUnit } from '../measurement/gpu/metric-fields';
import { legacyUnit } from './legacy-units';

export type { MetricUnit } from '../measurement/gpu/metric-fields';

export type TimeDisplayUnit = 'ms' | 'µs';

export function unitFor(key: string): MetricUnit {
  return measurementUnit(key) ?? legacyUnit(key) ?? '';
}
export function numeric(entry: LegacyEntry | undefined): number | null {
  if (
    !entry ||
    entry.type === 'string' ||
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(entry.display.trim())
  )
    return null;
  const value = Number(entry.display);
  if (Number.isFinite(value)) return value;
  return null;
}
function metricNumber(key: string, entry: LegacyEntry | undefined): number | null {
  if (/\.hash\.|_unique$|\.boundary$|\.edge_levels$/.test(key)) return null;
  return numeric(entry);
}
const MS_PER_UNIT: Partial<Record<MetricUnit, number>> = {
  s: 1000,
  ms: 1,
  µs: 0.001,
  ns: 0.000001,
};

export function isTimeMetric(key: string): boolean {
  return MS_PER_UNIT[unitFor(key)] !== undefined;
}
export function convertTime(value: number, source: MetricUnit, display: TimeDisplayUnit): number {
  const sourceScale = MS_PER_UNIT[source];
  if (sourceScale === undefined) return value;
  return value * (sourceScale / MS_PER_UNIT[display]!);
}
export function formatDelta(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Number(value.toPrecision(12));
  if (rounded > 0) return `+${rounded}`;
  return String(rounded);
}
export interface FormattedValues {
  current: string;
  imported: string;
  delta: string;
  unit: string;
}
export function formatResultValues(
  key: string,
  current: LegacyEntry | undefined,
  imported: LegacyEntry | undefined,
  display: TimeDisplayUnit = 'ms',
): FormattedValues {
  const a = metricNumber(key, current);
  const b = metricNumber(key, imported);
  const source = unitFor(key);
  let unit: MetricUnit = source;
  if (MS_PER_UNIT[source] !== undefined) unit = display;
  function text(entry: LegacyEntry | undefined, value: number | null): string {
    if (!entry) return '—';
    if (value === null || source === unit || MS_PER_UNIT[source] === undefined)
      return entry.display;
    const converted = convertTime(value, source, display);
    if (Number.isFinite(converted)) return String(converted);
    return '—';
  }
  let delta = '—';
  if (a !== null && b !== null) delta = formatDelta(convertTime(b - a, source, display));
  else if (current && imported) {
    delta = 'Different';
    if (current.type === imported.type && current.display === imported.display) delta = 'Same';
  }
  if (a === null && b === null) unit = '';
  return {
    current: text(current, a),
    imported: text(imported, b),
    delta,
    unit,
  };
}
