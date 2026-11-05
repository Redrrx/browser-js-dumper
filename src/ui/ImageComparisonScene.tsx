import { useCallback, useState } from 'react';
import type { SceneImageKey } from '../measurement/gpu';
import type { ImageComparisonSettings } from './ImageControls';
import { ImageMetrics, ImageVisualization } from './ImageAnalysisResults';
import { ImagePreview } from './ImagePreview';
import type { ImageSize } from './ImagePreview';
import { useImageAnalysis } from './useImageAnalysis';

interface ImageComparisonSceneProps {
  scene: SceneImageKey;
  label: string;
  aSource: string | undefined;
  bSource: string | undefined;
  settings: ImageComparisonSettings;
}

export function ImageComparisonScene({
  scene,
  label,
  aSource,
  bSource,
  settings,
}: ImageComparisonSceneProps) {
  const { mode, sensitivity, zoom, modifiers } = settings;
  const [split, setSplit] = useState(50);
  const [sizes, setSizes] = useState<Record<string, ImageSize>>({});
  let aSize: ImageSize | undefined;
  let bSize: ImageSize | undefined;
  if (aSource) aSize = sizes[aSource];
  if (bSource) bSize = sizes[bSource];
  let mismatch = false;
  if (aSize && bSize) mismatch = aSize.width !== bSize.width || aSize.height !== bSize.height;
  const size = aSize ?? bSize;
  let displayScale = 1;
  if (size && zoom > 0) displayScale = (256 * zoom) / Math.max(size.width, size.height);
  const analysis = useImageAnalysis(aSource, bSource, mismatch, mode, sensitivity, modifiers);
  const remember = useCallback((source: string, image: HTMLImageElement) => {
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    setSizes((previous) => {
      if (previous[source]?.width === width && previous[source]?.height === height) return previous;
      return { ...previous, [source]: { width, height } };
    });
  }, []);

  return (
    <section className="analysis-comparison" aria-label={`${label} comparison`}>
      <h2 className="analysis-comparison-heading">
        {label} vs {label}
        {size && (
          <span>
            {size.width}×{size.height} px
          </span>
        )}
      </h2>
      <ImageMetrics shown={analysis.shown} mode={mode} />
      <div className="analysis-comparison-images">
        <div>
          <h3>Current / imported</h3>
          <ImagePreview
            scene={scene}
            aSource={aSource}
            bSource={bSource}
            aSize={aSize}
            bSize={bSize}
            mismatch={mismatch}
            zoom={displayScale}
            split={split}
            onSplit={setSplit}
            onLoad={remember}
            onError={analysis.setError}
          />
        </div>
        <div aria-busy={analysis.updating}>
          <h3 className="analysis-output-heading">
            Comparison output
            <span className="analysis-update-status" aria-live="polite">
              {analysis.updating && 'Updating…'}
            </span>
          </h3>
          <ImageVisualization
            shown={analysis.shown}
            zoom={zoom}
            resetKey={scene}
            settings={settings}
          />
          {(!aSource || !bSource) && <p>A matching pair is required for this category.</p>}
          {mismatch && <p>Comparison is unavailable because the image dimensions differ.</p>}
        </div>
      </div>
      {analysis.error && (
        <p role="alert" className="analysis-error">
          {analysis.error}
        </p>
      )}
    </section>
  );
}
