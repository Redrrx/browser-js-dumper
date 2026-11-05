import type { AnalysisMode } from '../analysis/pixels';
import { SSIM_WINDOWS } from '../analysis/similarity';
import type { ComparisonModifiers } from '../analysis/similarity';

interface ImageModifiersProps {
  mode: AnalysisMode;
  modifiers: ComparisonModifiers;
  onChange: (patch: Partial<ComparisonModifiers>) => void;
}

export function ImageModifiers({ mode, modifiers, onChange }: ImageModifiersProps) {
  if (!['pixelmatch', 'jaccard', 'cosine', 'SSIM'].includes(mode)) return null;
  return (
    <fieldset className="analysis-fieldset analysis-comparison-modifiers">
      <legend>Modifiers</legend>
      <label className="analysis-label">
        Alpha handling
        <select
          value={modifiers.alpha}
          onChange={(event) =>
            onChange({ alpha: event.target.value as ComparisonModifiers['alpha'] })
          }
        >
          <option value="white">Composite on white</option>
          <option value="black">Composite on black</option>
          <option value="ignore">Ignore alpha</option>
        </select>
      </label>
      {mode === 'pixelmatch' && (
        <>
          <label className="analysis-label">
            Color tolerance (0–1)
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={modifiers.pixelThreshold}
              onChange={(event) => {
                if (event.target.validity.valid && event.target.value !== '')
                  onChange({ pixelThreshold: event.target.valueAsNumber });
              }}
            />
          </label>
          <label className="analysis-check">
            <input
              type="checkbox"
              checked={modifiers.includeAA}
              onChange={(event) => onChange({ includeAA: event.target.checked })}
            />
            Include anti-aliasing
          </label>
        </>
      )}
      {mode === 'jaccard' && (
        <label className="analysis-label">
          Foreground cutoff (0–255)
          <input
            type="number"
            min="0"
            max="255"
            step="1"
            value={modifiers.foregroundThreshold}
            onChange={(event) => {
              if (event.target.validity.valid && event.target.value !== '')
                onChange({ foregroundThreshold: event.target.valueAsNumber });
            }}
          />
        </label>
      )}
      {mode === 'SSIM' && (
        <label className="analysis-label">
          SSIM window
          <select
            value={modifiers.ssimWindow}
            onChange={(event) => onChange({ ssimWindow: Number(event.target.value) })}
          >
            {SSIM_WINDOWS.map((size) => (
              <option key={size} value={size}>
                {size} × {size} px
              </option>
            ))}
          </select>
        </label>
      )}
    </fieldset>
  );
}
