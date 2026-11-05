import { useId, useState } from 'react';
import type { ReactNode } from 'react';

import type { ScanMap } from '../measurement/scan';
import type { ScannerFilters } from './scanner-filters';
import { useScannerFilters } from './scanner-filters';
import { ScannerImport } from './ScannerImport';
import { ScannerToolbar, ScannerTypeFilters, ScannerComparisonFilters } from './ScannerControls';
import { ScannerSidebar } from './ScannerSidebar';
import { ScannerRows } from './ScannerRows';
import { ScannerResize } from './ScannerResize';
import './scanner.css';

export type ScannerProps = {
  current: ScanMap | null;
  imported: ScanMap | null;
  busy: boolean;
  onScan: () => void;
  onImport: (text: string) => void;
  onExport: () => void;
  onDump: () => void;
  status?: string;
  navigation?: ReactNode;
};

function ScannerStatus({
  filters,
  busy,
  status,
}: {
  filters: ScannerFilters;
  busy: boolean;
  status?: string;
}) {
  const { totals } = filters;
  let message = status ?? '';
  if (busy && !message) message = 'Scanning…';
  return (
    <footer className="scanner-statusbar">
      <span className="scanner-status-keys">
        keys <b>{totals.keys}</b>
      </span>
      <span className="scanner-status-diff">
        diff <b>{totals.different}</b>
      </span>
      <span className="scanner-status-same">
        same <b>{totals.same}</b>
      </span>
      <span className="scanner-status-missing">
        miss <b>{totals.missing}</b>
      </span>
      <output className="scanner-status-message">{message}</output>
    </footer>
  );
}

export function Scanner(props: ScannerProps) {
  const { current, imported, busy, status } = props;
  const id = useId();
  const categoriesId = `${id}-categories`;
  const filters = useScannerFilters(current, imported);
  const [sidebarWidth, setSidebarWidth] = useState(190);
  const [comparisonSplit, setComparisonSplit] = useState(50);
  const toolbar = (
    <>
      <button
        type="button"
        className="scanner-button"
        disabled={current === null || imported === null}
        aria-pressed={filters.compare}
        onClick={() => filters.setComparisonEnabled(!filters.compare)}
      >
        ⇌ Compare
      </button>
      <span className="scanner-separator" />
      <ScannerComparisonFilters filters={filters} />
      <span className="scanner-separator" />
      <ScannerToolbar filters={filters} categoriesId={categoriesId} />
      <ScannerTypeFilters filters={filters} />
      <button type="button" className="scanner-button" disabled={busy} onClick={props.onDump}>
        Dump
      </button>
    </>
  );
  return (
    <ScannerImport {...props} toolbar={toolbar}>
      <div className="scanner-workspace">
        <div className="scanner-sidebar-width" style={{ width: sidebarWidth }}>
          <ScannerSidebar filters={filters} id={categoriesId} />
        </div>
        <ScannerResize
          label="Category sidebar width"
          className="scanner-sidebar-resizer"
          value={sidebarWidth}
          min={80}
          max={400}
          onChange={setSidebarWidth}
        />
        <div className="scanner-results" aria-busy={busy}>
          <ScannerRows
            key={filters.rowsKey}
            rows={filters.visibleRows}
            compare={filters.compare}
            importedOnly={filters.importedOnly}
            split={comparisonSplit}
            onSplitChange={setComparisonSplit}
          />
        </div>
      </div>
      <ScannerStatus filters={filters} busy={busy} status={status ?? ''} />
    </ScannerImport>
  );
}
