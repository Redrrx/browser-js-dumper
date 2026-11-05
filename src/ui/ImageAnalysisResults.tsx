import { memo } from 'react';
import { ImageViewport } from './ImageViewport';
import type { ImageAnalysisOutput } from './useImageAnalysis';
import type { AnalysisMode } from '../analysis/pixels';

const METRICS = [
  { key: 'jaccard_similarity', label: 'Jaccard similarity (0–1)', unit: '', modes: ['jaccard'] },
  { key: 'cosine_similarity', label: 'Cosine similarity (0–1)', unit: '', modes: ['cosine'] },
  {
    key: 'perceptual_changed_pixels',
    label: 'Pixelmatch changed pixels',
    unit: '',
    modes: ['pixelmatch'],
  },
  {
    key: 'perceptual_changed_pct',
    label: 'Pixelmatch changed area',
    unit: '%',
    modes: ['pixelmatch'],
  },
  {
    key: 'foreground_intersection',
    label: 'Shared foreground pixels',
    unit: '',
    modes: ['jaccard'],
  },
  { key: 'foreground_union', label: 'Combined foreground pixels', unit: '', modes: ['jaccard'] },
  { key: 'ssim_mean', label: 'Mean SSIM', unit: '', modes: ['SSIM'] },
  { key: 'ssim_min', label: 'Lowest SSIM', unit: '', modes: ['SSIM'] },
  { key: 'blocks_below_099_pct', label: 'Blocks below 0.99 SSIM', unit: '%', modes: ['SSIM'] },
  { key: 'changed_pixels', label: 'Exact changed pixels (RGBA)', unit: '' },
  { key: 'affected_pct', label: 'Exact changed area', unit: '%' },
  { key: 'mean_delta', label: 'Mean pixel Δ (0–255)', unit: '' },
  { key: 'max_delta', label: 'Max channel Δ (0–255)', unit: '' },
  { key: 'edge_mean_delta', label: 'Mean edge Δ', unit: '', modes: ['edges', 'AA'] },
  {
    key: 'current_only_edges',
    label: 'Current-only edge pixels',
    unit: '',
    modes: ['edges', 'AA'],
  },
  {
    key: 'imported_only_edges',
    label: 'Imported-only edge pixels',
    unit: '',
    modes: ['edges', 'AA'],
  },
  { key: 'shared_edges', label: 'Shared edge pixels', unit: '', modes: ['edges', 'AA'] },
  { key: 'dc_power_pct', label: 'DC power', unit: '%', modes: ['frequency'] },
  {
    key: 'high_frequency_power_pct',
    label: 'High-frequency power',
    unit: '%',
    modes: ['frequency'],
  },
] as const;

interface ImageMetricsProps {
  shown: ImageAnalysisOutput | null;
}
interface ImageVisualizationProps extends ImageMetricsProps {
  zoom: number;
  resetKey: string;
  settings: Pick<ImageAnalysisOutput, 'mode' | 'modifiers'>;
}

function formatMetric(value: number) {
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toLocaleString(undefined, { maximumSignificantDigits: 6 });
}

export const ImageMetrics = memo(function ImageMetrics({
  shown,
  mode,
}: ImageMetricsProps & { mode: AnalysisMode }) {
  return (
    <dl className="analysis-metrics analysis-image-metrics">
      {METRICS.map((metric) => {
        const { key, label, unit } = metric;
        const value = shown?.metrics[key];
        if (shown && value === undefined) return null;
        if (!shown && 'modes' in metric && !metric.modes.some((item) => item === mode)) return null;
        let text = '—';
        if (value !== undefined) text = formatMetric(value) + unit;
        return (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{text}</dd>
          </div>
        );
      })}
    </dl>
  );
});

function visualizationNote(shown: Pick<ImageAnalysisOutput, 'mode' | 'modifiers'>): string {
  switch (shown.mode) {
    case 'jaccard':
      return 'Foreground: gray = shared, orange = current only, cyan = imported only.';
    case 'cosine':
      return 'Exact RGBA difference map. Cosine is a global RGB-vector score, not a per-pixel match.';
    case 'SSIM':
      return `SSIM loss by ${shown.modifiers.ssimWindow}×${shown.modifiers.ssimWindow} block. Black = identical structure.`;
    case 'pixelmatch':
      if (shown.modifiers.includeAA) return 'Red = perceptual mismatch, including anti-aliasing.';
      return 'Red = perceptual mismatch. Yellow = anti-aliasing excluded from the count.';
    case 'stats':
      return 'Histogram of exact max-RGBA differences, from 0 to 255.';
    default:
      return 'Heatmap scale changes visualization only; exact RGBA metrics remain unchanged.';
  }
}

export const ImageVisualization = memo(function ImageVisualization({
  shown,
  zoom,
  resetKey,
  settings,
}: ImageVisualizationProps) {
  const nativeWidth = shown?.width ?? 256;
  const nativeHeight = shown?.height ?? 256;
  let baseScale = 1;
  if (zoom > 0) baseScale = (256 * zoom) / Math.max(nativeWidth, nativeHeight);
  const width = nativeWidth * baseScale;
  const height = nativeHeight * baseScale;
  let alt = 'Comparison visualization';
  if (shown) alt = `${shown.mode} comparison visualization`;
  return (
    <figure className="analysis-comparison-output">
      <ImageViewport
        width={width}
        height={height}
        resetKey={resetKey}
        label="Pixel analysis visualization"
      >
        <img
          src={shown?.url}
          alt={alt}
          width={width}
          height={height}
          hidden={!shown}
          className="analysis-pixel-output"
        />
      </ImageViewport>
      <figcaption className="analysis-note">{visualizationNote(shown ?? settings)}</figcaption>
    </figure>
  );
});
