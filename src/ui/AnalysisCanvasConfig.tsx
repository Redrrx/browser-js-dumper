import { CANVAS_LAYER_DEFS, CANVAS_PRESETS, PREVIEWS } from '../measurement/gpu';
import type { AnalysisConfig, CanvasLayers } from '../measurement/gpu';
import { AnalysisCanvasTexts } from './AnalysisCanvasTexts.js';

type CanvasConfig = AnalysisConfig['canvas'];
const previews: Readonly<Record<string, string>> = PREVIEWS.canvas;

interface AnalysisCanvasConfigProps {
  draft: CanvasConfig;
  onChange: (patch: Partial<CanvasConfig>) => void;
}

export function AnalysisCanvasConfig({ draft, onChange: setCanvas }: AnalysisCanvasConfigProps) {
  function selectPreset(presetId: string) {
    const preset = CANVAS_PRESETS.find((item) => item.id === presetId);
    const patch: Partial<CanvasConfig> = { presetId };
    if (preset?.defaultLayers) patch.layers = { ...preset.defaultLayers };
    if (preset?.defaultTextStrings)
      patch.texts = preset.defaultTextStrings.map((text) => ({ ...text }));
    setCanvas(patch);
  }
  return (
    <>
      <h3>Canvas 2D</h3>
      <div className="analysis-scenes">
        {CANVAS_PRESETS.map((p) => (
          <button
            type="button"
            className="analysis-scene"
            aria-pressed={draft.presetId === p.id}
            key={p.id}
            onClick={() => selectPreset(p.id)}
          >
            <img src={previews[p.id]} alt={`${p.name} preview`} width="160" height="120" />
            <strong>{p.name}</strong>
          </button>
        ))}
      </div>
      <details className="analysis-disclosure">
        <summary>Canvas settings</summary>
        <div className="analysis-fields">
          {CANVAS_LAYER_DEFS.map((layer) => {
            const key = layer.id as keyof CanvasLayers;
            return (
              <label className="analysis-check" key={key} title={layer.tip}>
                <input
                  type="checkbox"
                  checked={draft.layers[key]}
                  onChange={(e) =>
                    setCanvas({
                      presetId: 'custom',
                      layers: { ...draft.layers, [key]: e.target.checked },
                    })
                  }
                />
                {layer.label}
              </label>
            );
          })}
        </div>
        <AnalysisCanvasTexts
          texts={draft.texts}
          onChange={(texts) => setCanvas({ presetId: 'custom', texts })}
        />
      </details>
    </>
  );
}
