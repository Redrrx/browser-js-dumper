import { memo } from 'react';
import { CANVAS_PRESETS, WEBGL_PRESETS } from '../measurement/gpu';
import type { AnalysisConfig, SceneImages } from '../measurement/gpu';
import { ImageViewport } from './ImageViewport';
import { RenderingSamples, renderingImage, useRenderingSample } from './RenderingSamples';

interface AnalysisScenesProps {
  config: AnalysisConfig;
  images: SceneImages;
}

export const AnalysisScenes = memo(function AnalysisScenes({
  config,
  images,
}: AnalysisScenesProps) {
  const { sample, onSample } = useRenderingSample(images);
  if (
    !images.webgl_grid &&
    !images.canvas_grid &&
    !images.webgl_primitives_v1 &&
    !images.canvas_primitives_v1
  )
    return null;

  const webgl = WEBGL_PRESETS.find((preset) => preset.id === config.webgl.presetId);
  const canvas = CANVAS_PRESETS.find((preset) => preset.id === config.canvas.presetId);
  const scenes = [
    {
      kind: 'WebGL',
      name: webgl?.name ?? config.webgl.presetId,
      captured: images[renderingImage('webgl_grid', sample)],
    },
    {
      kind: 'Canvas 2D',
      name: canvas?.name ?? config.canvas.presetId,
      captured: images[renderingImage('canvas_grid', sample)],
    },
  ];

  return (
    <section className="analysis-scene-output" aria-label="Rendered scenes">
      <h2>Scenes</h2>
      <RenderingSamples value={sample} onChange={onSample} />
      <div className="analysis-scene-previews">
        {scenes.map((scene) => {
          const source = scene.captured;
          return (
            <figure key={scene.kind}>
              <figcaption>
                <strong>{scene.kind}</strong>
                {source && <span>Captured pixels</span>}
                {!source && <span>Not captured</span>}
                {sample === 'template' && <span>Next run: {scene.name}</span>}
                {sample === 'primitives' && <span>Fixed primitives · v1</span>}
              </figcaption>
              {source && (
                <ImageViewport
                  resetKey={source}
                  width={256}
                  height={256}
                  label={`${scene.kind} preview`}
                >
                  <img
                    src={source}
                    alt={`${scene.kind} — Captured pixels`}
                    width={256}
                    height={256}
                  />
                </ImageViewport>
              )}
            </figure>
          );
        })}
      </div>
    </section>
  );
});
