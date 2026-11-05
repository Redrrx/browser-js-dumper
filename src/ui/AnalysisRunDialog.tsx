import { useEffect, useId, useRef } from 'react';
import type { AnalysisConfig as Config } from '../measurement/gpu';
import { AnalysisConfig } from './AnalysisConfig';

interface AnalysisRunDialogProps {
  config: Config;
  busy: boolean;
  onStart: (config: Config) => void;
  onCancel: () => void;
}

export function AnalysisRunDialog({ config, busy, onStart, onCancel }: AnalysisRunDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    return () => element.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="analysis-run-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <header className="analysis-dialog-header">
        <h2 id={titleId}>Run GPU analysis</h2>
        <button type="button" aria-label="Close scene chooser" onClick={onCancel}>
          ✕
        </button>
      </header>

      <p className="analysis-note">
        Every run also captures the fixed Canvas 2D and WebGL baseline tests, regardless of the
        selected scenes.
      </p>
      <AnalysisConfig
        config={config}
        busy={busy}
        onApply={onStart}
        onCancel={onCancel}
        submitLabel="Start analysis"
        cancelLabel="Cancel"
      />
    </dialog>
  );
}
