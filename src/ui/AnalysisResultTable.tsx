import type { ReactNode } from 'react';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import type { ResultRow } from '../analysis/imports';
import { measurementLabel } from '../analysis/measurement-labels';

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, ResultRow>();
const nameColumn = helper.accessor('key', {
  header: 'Result',
  cell: (info) => <span title={info.getValue()}>{measurementLabel(info.getValue())}</span>,
});
const currentColumn = helper.accessor('current', { header: 'Current machine' });
const basicColumns = helper.columns([
  nameColumn,
  currentColumn,
  helper.accessor('unit', { header: 'Unit' }),
]);
const comparedColumns = helper.columns([
  nameColumn,
  currentColumn,
  helper.accessor('imported', { header: 'Imported' }),
  helper.accessor('delta', { header: 'Delta (Δ)' }),
  helper.accessor('unit', { header: 'Unit' }),
]);

interface AnalysisResultTableProps {
  title: string;
  description: string;
  data: ResultRow[];
  compared: boolean;
  controls?: ReactNode;
}

export function AnalysisResultTable({
  title,
  description,
  data,
  compared,
  controls,
}: AnalysisResultTableProps) {
  let columns: typeof basicColumns | typeof comparedColumns = basicColumns;
  if (compared) columns = comparedColumns;
  const table = useTable({ features, columns, data, getRowId: (row) => row.key });
  return (
    <section className="analysis-result-section" aria-label={title}>
      <div className="analysis-actions analysis-result-controls">
        <h2>{title}</h2>
        <span className="analysis-row-count">{data.length} rows</span>
        {controls}
      </div>
      <p className="analysis-note">{description}</p>
      {compared && <p className="analysis-note">Δ = Imported − Current machine</p>}
      <section
        className="analysis-table-scroll"
        tabIndex={0}
        aria-label={`Scrollable ${title.toLowerCase()}`}
      >
        <table className="analysis-table" aria-label={title}>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} scope="col">
                    {!header.isPlaceholder && <table.FlexRender header={header} />}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getAllCells().map((cell) => (
                  <td
                    key={cell.id}
                    data-value-cell={['current', 'imported', 'delta'].includes(cell.column.id)}
                    data-missing={cell.getValue() === '—'}
                    data-changed={cell.column.id === 'delta' && cell.getValue() === 'Different'}
                    data-numeric={
                      String(cell.getValue()).length <= 24 &&
                      Number.isFinite(Number(cell.getValue()))
                    }
                  >
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!data.length && <p>No matching {title.toLowerCase()}.</p>}
      </section>
    </section>
  );
}
