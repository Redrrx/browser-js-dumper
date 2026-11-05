import type { ScannerFilters } from './scanner-filters';
import { ScannerNavigation } from './ScannerControls';

export function ScannerSidebar({ filters, id }: { filters: ScannerFilters; id: string }) {
  const { scope, category, categories, selectCategory } = filters;
  let className = 'scanner-sidebar';
  if (filters.sidebarOpen) className += ' scanner-sidebar-open';
  let scopeLabel: string = scope;
  if (scope === 'css') scopeLabel = 'CSS';
  const matchingCategories = [...categories].filter(([, info]) => info.searchMatch);
  return (
    <aside
      id={id}
      className={className}
      aria-label="Property categories"
      onKeyDown={(event) => {
        if (event.key === 'Escape') filters.setSidebarOpen(false);
      }}
    >
      <div className="scanner-namespace-search">
        <input
          className="scanner-search"
          aria-label="Search categories"
          type="search"
          value={filters.categorySearch}
          placeholder="namespace…"
          onChange={(event) => filters.setCategorySearch(event.currentTarget.value)}
        />
      </div>
      <ScannerNavigation filters={filters} />
      <nav className="scanner-category-list" aria-label="Categories">
        <button
          type="button"
          className="scanner-category"
          aria-pressed={category === null}
          onClick={() => selectCategory(null)}
        >
          <span className="scanner-category-name">All in {scopeLabel}</span>{' '}
          <span className="scanner-count">{filters.eligible.length}</span>
        </button>
        {matchingCategories.map(([name, info]) => (
          <button
            type="button"
            key={name}
            className="scanner-category"
            aria-pressed={category === name}
            onClick={() => selectCategory(name)}
          >
            <span className="scanner-category-name">{name || '(empty category)'}</span>{' '}
            <span className="scanner-count">{info.count}</span>
          </button>
        ))}
        {matchingCategories.length === 0 && (
          <p className="scanner-muted">No matching categories.</p>
        )}
      </nav>
    </aside>
  );
}
