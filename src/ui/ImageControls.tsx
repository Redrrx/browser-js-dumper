import { COMPARISON_MODES, MODES, SENSITIVITY } from '../analysis/pixels';
import type { AnalysisMode } from '../analysis/pixels';
import type { ComparisonModifiers } from '../analysis/similarity';
import { ImageModifiers } from './ImageModifiers';
import { RenderingSamples } from './RenderingSamples';
import type { RenderingCategory, RenderingSample } from './RenderingSamples';

export const MODE_LABELS: Record<AnalysisMode, string> = {
  heatmap: 'Exact pixel diff (RGBA)',
  pixelmatch: 'Pixelmatch (perceptual)',
  jaccard: 'Jaccard (foreground overlap)',
  cosine: 'Cosine (RGB vectors)',
  SSIM: 'Structural similarity (SSIM)',
  frequency: 'Frequency',
  edges: 'Edges',
  stats: 'Statistics',
  channels: 'Channels',
  subpixel: 'Subpixel',
  AA: 'Anti-aliasing',
};
const DIAGNOSTIC_MODES = MODES.filter((mode) => !COMPARISON_MODES.some((item) => item === mode));
export type ComparisonCategory = RenderingCategory;
export interface ImageComparisonSettings {
  mode: AnalysisMode;
  sensitivity: number;
  zoom: number;
  modifiers: ComparisonModifiers;
}

interface ImageControlsProps {
  category: ComparisonCategory;
  onCategory: (category: ComparisonCategory) => void;
  sample: RenderingSample;
  onSample: (sample: RenderingSample) => void;
  settings: ImageComparisonSettings;
  onChange: (patch: Partial<ImageComparisonSettings>) => void;
}

export function ImageControls({
  category,
  onCategory,
  sample,
  onSample,
  settings,
  onChange,
}: ImageControlsProps) {
  const { mode, sensitivity, zoom, modifiers } = settings;
  const showScale = mode !== 'pixelmatch' && mode !== 'jaccard' && mode !== 'stats';
  return (
    <div className="analysis-actions analysis-comparison-controls">
      <RenderingSamples value={sample} onChange={onSample} />
      <fieldset className="analysis-category-picker">
        <legend>Comparison category</legend>
        <div className="analysis-category-buttons">
          <button
            type="button"
            aria-pressed={category === 'webgl_grid'}
            onClick={() => onCategory('webgl_grid')}
          >
            WebGL
          </button>
          <button
            type="button"
            aria-pressed={category === 'canvas_grid'}
            onClick={() => onCategory('canvas_grid')}
          >
            Canvas 2D
          </button>
        </div>
      </fieldset>
      <label className="analysis-label">
        Comparison method
        <select
          value={mode}
          onChange={(event) => onChange({ mode: event.target.value as AnalysisMode })}
        >
          <optgroup label="Comparison">
            {COMPARISON_MODES.map((item) => (
              <option key={item} value={item}>
                {MODE_LABELS[item]}
              </option>
            ))}
          </optgroup>
          <optgroup label="Diagnostics">
            {DIAGNOSTIC_MODES.map((item) => (
              <option key={item} value={item}>
                {MODE_LABELS[item]}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <ImageModifiers
        mode={mode}
        modifiers={modifiers}
        onChange={(patch) => onChange({ modifiers: { ...modifiers, ...patch } })}
      />
      {showScale && (
        <label className="analysis-label">
          Heatmap scale (display only)
          <select
            value={sensitivity}
            onChange={(event) => onChange({ sensitivity: Number(event.target.value) })}
          >
            {SENSITIVITY.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="analysis-label">
        Preview size
        <select value={zoom} onChange={(event) => onChange({ zoom: Number(event.target.value) })}>
          <option value={0}>Native</option>
          {[1, 2, 4, 8, 16].map((value) => (
            <option key={value} value={value}>
              {256 * value} px
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
