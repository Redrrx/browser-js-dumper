import { memo, useState } from 'react';
import { ImageControls } from './ImageControls';
import { renderingImage, useRenderingSample } from './RenderingSamples';
import type { ComparisonCategory, ImageComparisonSettings } from './ImageControls';
import type { SceneImages } from '../measurement/gpu';
import { DEFAULT_MODIFIERS } from '../analysis/similarity';
import { ImageComparisonScene } from './ImageComparisonScene';
import './analysis.css';

export interface ImageComparisonProps {
  current: SceneImages;
  imported: SceneImages;
}

export const ImageComparison = memo(function ImageComparison({
  current,
  imported,
}: ImageComparisonProps) {
  const [category, setCategory] = useState<ComparisonCategory>(() => {
    if (current.webgl_grid && imported.webgl_grid) return 'webgl_grid';
    if (current.canvas_grid || imported.canvas_grid) return 'canvas_grid';
    return 'webgl_grid';
  });
  const { sample, onSample } = useRenderingSample(current);
  const imageKey = renderingImage(category, sample);
  const [settings, setSettings] = useState<ImageComparisonSettings>({
    mode: 'heatmap',
    sensitivity: 8,
    zoom: 1,
    modifiers: { ...DEFAULT_MODIFIERS },
  });
  let label = 'WebGL';
  if (category === 'canvas_grid') label = 'Canvas 2D';

  return (
    <div className="analysis-comparison-layout">
      <aside aria-label="Comparison controls">
        <ImageControls
          category={category}
          onCategory={setCategory}
          sample={sample}
          onSample={onSample}
          settings={settings}
          onChange={(patch) => setSettings((previous) => ({ ...previous, ...patch }))}
        />
      </aside>
      <ImageComparisonScene
        settings={settings}
        scene={imageKey}
        label={label}
        aSource={current[imageKey]}
        bSource={imported[imageKey]}
      />
    </div>
  );
});
export default ImageComparison;
