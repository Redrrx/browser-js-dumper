import type { ScanEntry, ScanMap } from '../measurement/scan';

export type Scope = 'scope' | 'css' | 'all';
export type Comparison = 'all' | 'different' | 'same' | 'missing';
export type ScanRow = {
  path: string;
  category: string;
  current: ScanEntry | undefined;
  imported: ScanEntry | undefined;
  state: 'same' | 'type' | 'value' | 'missing';
  delta: number | null;
};

function scopeOf(category: string): Exclude<Scope, 'all'> | 'other' {
  if (category === 'media_queries' || category.startsWith('css')) return 'css';
  if (['webgl', 'webgpu', 'gpu_fp', 'wasm', 'wasm_exec'].includes(category)) return 'other';
  return 'scope';
}

function numeric(entry: ScanEntry | undefined): number | null {
  if (!entry || (entry.type !== 'integer' && entry.type !== 'float')) return null;
  const value = Number(entry.display);
  if (Number.isFinite(value)) return value;
  return null;
}

function comparisonState(
  current: ScanEntry | undefined,
  imported: ScanEntry | undefined,
): ScanRow['state'] {
  if (!current || !imported) return 'missing';
  const a = numeric(current);
  const b = numeric(imported);
  if (a !== null && b !== null && a === b) return 'same';
  if (current.type !== imported.type) return 'type';
  if (current.display !== imported.display) return 'value';
  return 'same';
}

function pairedRow(
  path: string,
  current: ScanEntry | undefined,
  imported: ScanEntry | undefined,
): ScanRow {
  const a = numeric(current);
  const b = numeric(imported);
  let delta = null;
  if (a !== null && b !== null) delta = b - a;
  return {
    path,
    category: path.split('.')[0] ?? path,
    current,
    imported,
    state: comparisonState(current, imported),
    delta,
  };
}

export function scanRows(
  current: ScanMap | null,
  imported: ScanMap | null,
  compare: boolean,
): ScanRow[] {
  let paths = new Set((current ?? imported)?.keys());
  let importedRows: ScanMap | null = null;
  if (compare && current && imported) paths = new Set([...current.keys(), ...imported.keys()]);
  if (compare || current === null) importedRows = imported;
  return Array.from(paths, (path) => pairedRow(path, current?.get(path), importedRows?.get(path)));
}

export function rowTypes(rows: ScanRow[]): string[] {
  const result = new Set<string>();
  for (const row of rows) {
    if (row.current) result.add(row.current.type);
    if (row.imported) result.add(row.imported.type);
  }
  return [...result];
}

function matchesComparison(row: ScanRow, filter: Comparison): boolean {
  if (filter === 'all') return true;
  if (filter === 'different') return row.state === 'value' || row.state === 'type';
  return row.state === filter;
}

function rowText(row: ScanRow): string {
  return `${row.path} ${row.current?.type ?? ''} ${row.current?.display ?? ''} ${row.imported?.type ?? ''} ${row.imported?.display ?? ''}`.toLowerCase();
}

export function eligibleRows(
  rows: ScanRow[],
  scope: Scope,
  excludedTypes: Set<string>,
  compare: boolean,
  comparison: Comparison,
  search: string,
): ScanRow[] {
  const query = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (scope !== 'all' && scopeOf(row.category) !== scope) return false;
    const currentIncluded = row.current && !excludedTypes.has(row.current.type);
    const importedIncluded = row.imported && !excludedTypes.has(row.imported.type);
    if (!currentIncluded && !importedIncluded) return false;
    if (compare && !matchesComparison(row, comparison)) return false;
    return !query || rowText(row).includes(query);
  });
}

export function rowCategories(rows: ScanRow[], search: string) {
  const result = new Map<string, { count: number; searchMatch: boolean }>();
  const query = search.trim().toLowerCase();
  for (const row of rows) {
    const info = result.get(row.category) ?? { count: 0, searchMatch: false };
    info.count++;
    info.searchMatch ||=
      !query || row.category.toLowerCase().includes(query) || rowText(row).includes(query);
    result.set(row.category, info);
  }
  return result;
}

export function categoryRows(rows: ScanRow[], category: string | null): ScanRow[] {
  if (category === null) return rows;
  return rows.filter((row) => row.category === category);
}

export function scopeCounts(rows: ScanRow[]) {
  const result = { all: rows.length, scope: 0, css: 0 };
  for (const row of rows) {
    const group = scopeOf(row.category);
    if (group !== 'other') result[group]++;
  }
  return result;
}
