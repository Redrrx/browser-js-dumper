import { useRef } from 'react';
import type { CSSProperties } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { VirtualItem } from '@tanstack/react-virtual';
import type { ScanEntry } from '../measurement/scan';
import type { ScanRow } from '../analysis/scan-rows';
import { ScannerResize } from './ScannerResize';

function rowDescription(row: ScanRow): string {
  let description: string = row.state;
  if (row.delta !== null) {
    let delta = String(row.delta);
    if (row.delta > 0) delta = `+${delta}`;
    description += ` · Δ imported − current: ${delta}`;
  }
  return description;
}

function RowValue({
  row,
  entry,
  compare,
}: {
  row: ScanRow;
  entry: ScanEntry | undefined;
  compare: boolean;
}) {
  let display = '(absent)';
  let state = 'absent';
  let tag = '';
  if (entry) {
    display = entry.display;
    if (display === '') display = '""';
    state = row.state;
    if (compare && state === 'missing') tag = 'only';
    if (compare && state === 'value') tag = 'val';
    if (compare && state === 'type') tag = 'type';
  }
  let title = `${row.path} = ${display}`;
  if (compare) title += `\n${rowDescription(row)}`;
  return (
    <code
      className="scanner-row-value"
      data-type={entry?.type}
      data-state={state}
      title={title}
      tabIndex={0}
    >
      {row.path} = {display}
      {tag && <span className="scanner-row-tag">{tag}</span>}
    </code>
  );
}

function VirtualRow({
  row,
  item,
  count,
  compare,
  importedOnly,
}: {
  row: ScanRow;
  item: VirtualItem;
  count: number;
  compare: boolean;
  importedOnly: boolean;
}) {
  let entry = row.current;
  if (importedOnly) entry = row.imported;
  return (
    <div
      role="listitem"
      aria-posinset={item.index + 1}
      aria-setsize={count}
      className="scanner-row"
      style={{ height: item.size, transform: `translateY(${item.start}px)` }}
    >
      <RowValue row={row} entry={entry} compare={compare} />
      {compare && <span />}
      {compare && <RowValue row={row} entry={row.imported} compare={compare} />}
    </div>
  );
}

function ComparisonHeaders({ rows }: { rows: ScanRow[] }) {
  const currentCount = rows.filter((row) => row.current).length;
  const importedCount = rows.filter((row) => row.imported).length;
  return (
    <div className="scanner-column-heads">
      <div className="scanner-column-head">
        <span>Current browser</span>
        <span className="scanner-environment-count">{currentCount} keys</span>
      </div>
      <span />
      <div className="scanner-column-head">
        <span>Imported environment</span>
        <span className="scanner-environment-count">{importedCount} keys</span>
      </div>
    </div>
  );
}

export function ScannerRows({
  rows,
  compare,
  importedOnly,
  split,
  onSplitChange,
}: {
  rows: ScanRow[];
  compare: boolean;
  importedOnly: boolean;
  split: number;
  onSplitChange: (value: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtual = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 18,
    getItemKey: (index) => rows[index]?.path ?? index,
    overscan: 12,
    initialRect: { width: 800, height: 560 },
  });
  let className = 'scanner-data';
  if (compare) className += ' scanner-paired';
  const style = { '--scanner-split': `${split}%` } as CSSProperties;
  return (
    <div className={className} style={style}>
      {compare && <ComparisonHeaders rows={rows} />}
      <div
        ref={scrollRef}
        className="scanner-scroll"
        tabIndex={0}
        role="region"
        aria-label="Scan entries"
        data-testid="scanner-scroll"
      >
        <div
          className="scanner-virtual"
          role="list"
          aria-label="Properties"
          style={{ height: virtual.getTotalSize() }}
        >
          {virtual.getVirtualItems().map((item) => {
            const row = rows[item.index];
            if (!row) return null;
            return (
              <VirtualRow
                key={item.key}
                row={row}
                item={item}
                count={rows.length}
                compare={compare}
                importedOnly={importedOnly}
              />
            );
          })}
        </div>
      </div>
      {compare && (
        <ScannerResize
          label="Comparison column width"
          className="scanner-column-resizer"
          value={split}
          min={10}
          max={90}
          percent
          onChange={onSplitChange}
        />
      )}
    </div>
  );
}
