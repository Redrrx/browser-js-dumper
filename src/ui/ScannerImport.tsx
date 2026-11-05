import { useEffect, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import type { ScannerProps } from './Scanner';

function ScannerHeader({
  current,
  imported,
  busy,
  onScan,
  onExport,
  importFile,
  toolbar,
  navigation,
}: Omit<ScannerProps, 'onImport'> & {
  importFile: (file: File) => Promise<void>;
  toolbar: ReactNode;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  let scanLabel = '▶ Scan';
  if (busy) scanLabel = 'Scanning…';
  return (
    <header className="scanner-toolbar" aria-label="Scanner toolbar">
      {navigation}
      <span className="toolbar-separator" />
      <button
        type="button"
        className="scanner-button scanner-primary"
        aria-busy={busy}
        disabled={busy}
        onClick={onScan}
      >
        {busy && <span className="app-spinner" aria-hidden="true" />}
        {scanLabel}
      </button>
      <button
        type="button"
        className="scanner-button"
        disabled={busy || current === null}
        onClick={onExport}
      >
        ↓ Export
      </button>
      <button
        type="button"
        className="scanner-button scanner-import-button"
        data-has-data={imported !== null}
        disabled={busy}
        onClick={() => fileRef.current?.click()}
      >
        ⊕ Import
      </button>
      {toolbar}
      <input
        ref={fileRef}
        className="scanner-file"
        type="file"
        accept=".json,application/json"
        aria-label="Import scan file"
        disabled={busy}
        onChange={(event) => {
          const file = event.currentTarget.files?.item(0);
          event.currentTarget.value = '';
          if (file) void importFile(file);
        }}
      />
    </header>
  );
}

export function ScannerImport({
  children,
  toolbar,
  ...props
}: ScannerProps & {
  children: ReactNode;
  toolbar: ReactNode;
}) {
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const { busy, onImport } = props;
  const importJob = useRef(0);

  useEffect(
    () => () => {
      importJob.current++;
    },
    [],
  );

  async function importFile(file: File) {
    const job = ++importJob.current;
    setFileError('');
    if (file.size > 32 * 1024 * 1024) {
      setFileError('Import is limited to 32 MiB.');
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      if (job !== importJob.current) return;
      setFileError(`Could not read ${file.name}. Try choosing the file again.`);
      return;
    }
    if (job !== importJob.current) return;
    onImport(text);
  }

  function dragEnter(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    setDragging(true);
  }

  function dragOver(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    if (busy) event.dataTransfer.dropEffect = 'none';
  }

  function dragLeave(event: DragEvent<HTMLDivElement>) {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))
      return;
    setDragging(false);
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    const files = event.dataTransfer.files;
    if (files.length !== 1) {
      setFileError('Choose one scan file at a time.');
      return;
    }
    const file = files.item(0);
    if (file) void importFile(file);
  }

  let className = 'scanner-root';
  if (dragging) className += ' scanner-dragging';
  return (
    <div
      className={className}
      onDragEnter={dragEnter}
      onDragOver={dragOver}
      onDragLeave={dragLeave}
      onDrop={drop}
    >
      <ScannerHeader {...props} importFile={importFile} toolbar={toolbar} />
      {fileError && (
        <p role="alert" className="scanner-error">
          {fileError}
        </p>
      )}
      {children}
    </div>
  );
}
