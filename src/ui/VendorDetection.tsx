import { memo } from 'react';
import { useStore } from 'zustand';
import { PIXELTELLS_MODELS } from '../analysis/pixeltells';
import { appStore, retryVendorDetection } from '../application/app';
import { vendorDetectionStore } from '../application/vendor-detection';
import { vendorPresentation } from './vendor-presentation';

export const VendorDetection = memo(function VendorDetection() {
  const busy = useStore(appStore, (state) => state.busy);
  const state = useStore(vendorDetectionStore);
  const view = vendorPresentation(state);

  return (
    <aside
      className="analysis-vendor-panel"
      aria-label="Vendor heuristics"
      aria-busy={view.testing}
    >
      <h2>
        Vendor heuristics <span>WIP</span>
      </h2>
      <div className="analysis-vendor-toolbar">
        <span className="analysis-vendor-scope">This machine</span>
        <button
          type="button"
          onClick={() => void retryVendorDetection()}
          aria-label="Run vendor tests on this machine"
          aria-busy={view.testing}
          disabled={busy || view.testing}
        >
          {view.testing && <span className="app-spinner" aria-hidden="true" />}
          {view.action}
        </button>
      </div>
      <div className="analysis-vendor-run">
        <output className="analysis-vendor-summary" aria-live="polite">
          <strong data-state={state.status}>{view.run}</strong>
          <span>{view.summary}</span>
        </output>
        <div className="analysis-vendor-pattern" hidden={!view.testing && !state.preview}>
          <img
            src={state.preview ?? undefined}
            hidden={!state.preview}
            width={64}
            height={32}
            alt="PixelTells filtering pattern and black control"
          />
        </div>
      </div>
      <details className="analysis-vendor-details">
        <summary
          aria-label={`PixelTells · ${PIXELTELLS_MODELS.length} formulas · ${view.formulas}`}
        >
          <span>
            <strong>PixelTells</strong>
            <span className="analysis-vendor-count">{PIXELTELLS_MODELS.length} formulas</span>
            <span className="analysis-vendor-outcome">{view.formulas}</span>
          </span>
        </summary>
        <table className="analysis-vendor-tests" aria-label="PixelTells tests on this machine">
          <thead>
            <tr>
              <th scope="col">Test</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row) => (
              <tr key={row.test}>
                <th scope="row">{row.test}</th>
                <td data-result={row.result}>
                  {row.result}
                  <small>{row.detail}</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="analysis-vendor-source">
          <a href="https://github.com/Redrrx/PixelTells" target="_blank" rel="noreferrer">
            Source
          </a>
          <span>Exact RGB channels</span>
        </div>
      </details>
      {state.error && (
        <p className="analysis-error" role="alert">
          {state.error}
        </p>
      )}
    </aside>
  );
});
