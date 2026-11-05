import type { ScannerFilters } from './scanner-filters';

const scopes = [
  { value: 'scope', label: 'Scope' },
  { value: 'css', label: 'CSS' },
  { value: 'all', label: 'All' },
] as const;
const comparisons = [
  { value: 'all', label: 'All' },
  { value: 'different', label: '≠ Different' },
  { value: 'same', label: '= Same' },
  { value: 'missing', label: '∅ Missing' },
] as const;
const typeLabels: Record<string, string> = {
  string: 'str',
  integer: 'int',
  boolean: 'bool',
  object: 'obj',
  function: 'fn',
  undefined: 'undef',
};

export function ScannerNavigation({ filters }: { filters: ScannerFilters }) {
  return (
    <div className="scanner-scope" role="group" aria-label="Scan scope">
      {scopes.map(({ value, label }) => (
        <button
          type="button"
          key={value}
          className="scanner-tab"
          aria-pressed={filters.scope === value}
          onClick={() => filters.selectScope(value)}
        >
          {label} <span className="scanner-count">{filters.counts[value]}</span>
        </button>
      ))}
    </div>
  );
}

export function ScannerToolbar({
  filters,
  categoriesId,
}: {
  filters: ScannerFilters;
  categoriesId: string;
}) {
  let toggleLabel = 'Show categories';
  if (filters.sidebarOpen) toggleLabel = 'Hide categories';
  return (
    <>
      <button
        type="button"
        className="scanner-button scanner-sidebar-toggle"
        aria-expanded={filters.sidebarOpen}
        aria-controls={categoriesId}
        onClick={() => filters.setSidebarOpen((value) => !value)}
      >
        {toggleLabel}
      </button>
      <input
        className="scanner-search"
        type="search"
        aria-label="Search paths and values"
        value={filters.search}
        placeholder="filter paths / values…"
        onChange={(event) => filters.setSearch(event.currentTarget.value)}
      />
    </>
  );
}

export function ScannerTypeFilters({ filters }: { filters: ScannerFilters }) {
  const { types, excludedTypes, toggleType } = filters;
  return (
    <div className="scanner-types" role="group" aria-label="Type filters">
      {types.map((type) => (
        <label key={type} className="scanner-type" title={type}>
          <input
            type="checkbox"
            checked={!excludedTypes.has(type)}
            onChange={(event) => toggleType(type, event.currentTarget.checked)}
          />
          {typeLabels[type] ?? type}
        </label>
      ))}
    </div>
  );
}

export function ScannerComparisonFilters({ filters }: { filters: ScannerFilters }) {
  return (
    <div className="scanner-comparison-filters" role="group" aria-label="Comparison filter">
      {comparisons.map(({ value, label }) => (
        <button
          type="button"
          key={value}
          className="scanner-tab"
          data-filter={value}
          aria-pressed={filters.comparison === value}
          disabled={!filters.compare}
          onClick={() => filters.setComparison(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
