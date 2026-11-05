import { useEffect, useRef, useState } from 'react';
import { parseAnalysisImport } from '../analysis/imports';
import type { ImportedAnalysis } from '../analysis/imports';

export function useAnalysisImport() {
  const [comparison, setComparison] = useState<ImportedAnalysis | null>(null);
  const [filename, setFilename] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const job = useRef(0);

  useEffect(
    () => () => {
      job.current++;
    },
    [],
  );

  async function importFile(file: File) {
    const id = ++job.current;
    setImporting(true);
    setImportError('');
    try {
      if (file.size > 32 * 1024 * 1024) throw new Error('Import is limited to 32 MiB');
      const parsed = parseAnalysisImport(JSON.parse(await file.text()) as unknown);
      if (id !== job.current) return;
      setComparison(parsed);
      setFilename(file.name);
    } catch (cause) {
      if (id !== job.current) return;
      if (cause instanceof Error) setImportError(cause.message);
      else setImportError('Invalid analysis file');
    } finally {
      if (id === job.current) setImporting(false);
    }
  }

  function clearComparison() {
    job.current++;
    setImporting(false);
    setComparison(null);
    setFilename('');
    setImportError('');
  }

  return { comparison, filename, importError, importing, importFile, clearComparison };
}
