import { useRef } from 'react';
import type { useAnalysisImport } from './useAnalysisImport';

type AnalysisImportProps = ReturnType<typeof useAnalysisImport>;

export function AnalysisImport({
  comparison,
  filename,
  importError,
  importing,
  importFile,
  clearComparison,
}: AnalysisImportProps) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <button type="button" disabled={importing} onClick={() => input.current?.click()}>
        Import comparison
      </button>
      <input
        ref={input}
        type="file"
        aria-label="Import comparison JSON"
        accept=".json,application/json"
        hidden
        disabled={importing}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void importFile(file);
        }}
      />
      {importing && <p role="status">Validating import…</p>}
      {comparison && (
        <div className="analysis-import-status">
          <span>
            {filename} · {comparison.gpu.size} GPU / {comparison.timing.size} timing entries
          </span>
          <button
            type="button"
            onClick={() => {
              clearComparison();
            }}
          >
            Clear comparison
          </button>
        </div>
      )}
      {importError && (
        <p className="analysis-error" role="alert">
          Import failed: {importError}
        </p>
      )}
    </>
  );
}
