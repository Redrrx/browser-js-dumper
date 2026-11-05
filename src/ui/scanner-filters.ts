import { useMemo, useState } from 'react';
import type { ScanMap } from '../measurement/scan';
import {
  categoryRows,
  eligibleRows,
  rowCategories,
  rowTypes,
  scanRows,
  scopeCounts,
} from '../analysis/scan-rows';
import type { Comparison, Scope } from '../analysis/scan-rows';

export function useScannerFilters(current: ScanMap | null, imported: ScanMap | null) {
  const [search, setSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [category, setCategory] = useState<string | null>(null);
  const [excludedTypes, setExcludedTypes] = useState<Set<string>>(
    () => new Set(['function', 'undefined']),
  );
  const [comparisonEnabled, setComparisonEnabled] = useState(true);
  const [comparison, setComparison] = useState<Comparison>('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const compare = comparisonEnabled && current !== null && imported !== null;
  const importedOnly = current === null && imported !== null;
  const rows = useMemo(() => scanRows(current, imported, compare), [current, imported, compare]);
  const types = useMemo(
    () => [
      ...new Set([
        'string',
        'integer',
        'float',
        'boolean',
        'null',
        'object',
        'function',
        'undefined',
        'throws',
        ...rowTypes(rows),
      ]),
    ],
    [rows],
  );
  const eligible = useMemo(
    () => eligibleRows(rows, scope, excludedTypes, compare, comparison, search),
    [rows, scope, excludedTypes, compare, comparison, search],
  );
  const categories = useMemo(
    () => rowCategories(eligible, categorySearch),
    [eligible, categorySearch],
  );
  const visibleRows = useMemo(() => categoryRows(eligible, category), [eligible, category]);
  const counts = useMemo(() => scopeCounts(rows), [rows]);
  const totals = useMemo(() => {
    const result = { keys: visibleRows.length, different: 0, same: 0, missing: 0 };
    if (!compare) return result;
    for (const row of visibleRows) {
      if (row.state === 'same') result.same++;
      else if (row.state === 'missing') result.missing++;
      else result.different++;
    }
    return result;
  }, [visibleRows, compare]);
  const rowsKey = JSON.stringify([
    scope,
    category,
    search,
    [...excludedTypes],
    compare,
    comparison,
    current === null,
    rows.length,
  ]);

  function resetFilters() {
    setSearch('');
    setCategorySearch('');
    setCategory(null);
    setExcludedTypes(new Set(['function', 'undefined']));
    setComparison('all');
  }

  function selectScope(value: Scope) {
    setScope(value);
    setCategory(null);
  }

  function selectCategory(value: string | null) {
    setCategory(value);
    setSidebarOpen(false);
  }

  function toggleType(type: string, checked: boolean) {
    setExcludedTypes((previous) => {
      const next = new Set(previous);
      if (checked) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  return {
    search,
    setSearch,
    categorySearch,
    setCategorySearch,
    scope,
    selectScope,
    category,
    selectCategory,
    excludedTypes,
    setExcludedTypes,
    compare,
    setComparisonEnabled,
    comparison,
    setComparison,
    sidebarOpen,
    setSidebarOpen,
    importedOnly,
    types,
    eligible,
    categories,
    visibleRows,
    counts,
    totals,
    rowsKey,
    resetFilters,
    toggleType,
  };
}

export type ScannerFilters = ReturnType<typeof useScannerFilters>;
