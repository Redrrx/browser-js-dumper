import { useState } from 'react';
import type { SceneImageKey, SceneImages } from '../measurement/gpu';

export type RenderingSample = 'primitives' | 'template';
export type RenderingCategory = 'webgl_grid' | 'canvas_grid';

export function useRenderingSample(images: SceneImages) {
  const [selection, setSelection] = useState<{ images: SceneImages; sample: RenderingSample }>({
    images,
    sample: 'template',
  });
  let sample: RenderingSample = 'template';
  if (selection.images === images) sample = selection.sample;
  return { sample, onSample: (next: RenderingSample) => setSelection({ images, sample: next }) };
}
export function renderingImage(
  category: RenderingCategory,
  sample: RenderingSample,
): SceneImageKey {
  if (sample === 'template') return category;
  if (category === 'canvas_grid') return 'canvas_primitives_v1';
  return 'webgl_primitives_v1';
}
export function RenderingSamples({
  value,
  onChange,
}: {
  value: RenderingSample;
  onChange: (value: RenderingSample) => void;
}) {
  return (
    <fieldset className="analysis-category-picker">
      <legend>Rendering samples</legend>
      <div className="analysis-category-buttons">
        <button
          type="button"
          aria-pressed={value === 'template'}
          onClick={() => onChange('template')}
        >
          Template
        </button>
        <button
          type="button"
          aria-pressed={value === 'primitives'}
          onClick={() => onChange('primitives')}
        >
          Baseline v1
        </button>
      </div>
      <p className="analysis-note">Baseline: blank tiles may be unavailable. See the test list.</p>
    </fieldset>
  );
}
