import { memo, useMemo } from 'react';
import { gpuToEntries, timingToEntries } from '../measurement/gpu';
import type { LegacyEntry } from '../measurement/gpu';
import { resultRows } from '../analysis/imports';
import type { ImportedAnalysis } from '../analysis/imports';
import { isTimeMetric } from '../analysis/format';
import type { TimeDisplayUnit } from '../analysis/format';
import { measurementLabel } from '../analysis/measurement-labels';
import { AnalysisResultTable } from './AnalysisResultTable';
import type { AnalysisProps } from './Analysis';

type AnalysisResultsProps = Pick<AnalysisProps, 'kind' | 'gpu' | 'timing'> & {
  comparison: ImportedAnalysis | null;
  query: string;
  onQuery: (query: string) => void;
  timeUnit: TimeDisplayUnit;
  onTimeUnit: (unit: TimeDisplayUnit) => void;
};

export const AnalysisResults = memo(function AnalysisResults({
  kind,
  gpu,
  timing,
  comparison,
  query,
  onQuery,
  timeUnit,
  onTimeUnit,
}: AnalysisResultsProps) {
  const entries = useMemo(() => {
    if (kind === 'gpu' && gpu) return gpuToEntries(gpu.results);
    if (kind === 'timing' && timing) return timingToEntries(timing);
    return new Map<string, LegacyEntry>();
  }, [kind, gpu, timing]);
  const data = useMemo(() => {
    let imported = new Map<string, LegacyEntry>();
    if (comparison) imported = comparison[kind];
    return resultRows(entries, imported, timeUnit).filter((row) =>
      `${measurementLabel(row.key)} ${row.key}`.toLowerCase().includes(query.toLowerCase()),
    );
  }, [entries, comparison, kind, query, timeUnit]);
  const { values, timings } = useMemo(
    () => ({
      values: data.filter((row) => !isTimeMetric(row.key)),
      timings: data.filter((row) => isTimeMetric(row.key)),
    }),
    [data],
  );
  return (
    <>
      <div className="analysis-actions analysis-result-controls">
        <h2>Results</h2>
        <input
          className="analysis-filter"
          aria-label="Filter results"
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search values and timings"
        />
        <span className="analysis-row-count">{data.length} rows</span>
      </div>
      <div className="analysis-result-tables">
        <AnalysisResultTable
          title="Values"
          description="Hashes, precision, counts, rates and flags. Original units are preserved."
          data={values}
          compared={Boolean(comparison)}
        />
        <AnalysisResultTable
          title="Timings"
          description="Durations and timestamps only. Unit conversion applies to this table."
          data={timings}
          compared={Boolean(comparison)}
          controls={
            <label className="analysis-time-unit">
              Time unit
              <select
                value={timeUnit}
                onChange={(event) => onTimeUnit(event.target.value as TimeDisplayUnit)}
              >
                <option value="ms">ms</option>
                <option value="µs">µs</option>
              </select>
            </label>
          }
        />
      </div>
      {kind === 'gpu' && gpu && Object.keys(gpu.results.errors).length > 0 && (
        <div className="analysis-errors">
          <h3>Probe errors</h3>
          <ul>
            {Object.entries(gpu.results.errors).map(([key, error]) => (
              <li key={key}>
                <strong>{key}</strong>: {error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
});
