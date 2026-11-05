import { PREVIEWS, WEBGL_PRESETS } from '../measurement/gpu';
import type { AnalysisConfig, PresetParam } from '../measurement/gpu';

type WebGLConfig = AnalysisConfig['webgl'];
const previews: Readonly<Record<string, string>> = PREVIEWS.webgl;

interface AnalysisWebGLConfigProps {
  draft: WebGLConfig;
  onChange: (patch: Partial<WebGLConfig>) => void;
}
interface AnalysisWebGLParameterProps {
  param: PresetParam;
  value: string | number;
  onChange: (value: string | number) => void;
}

function AnalysisWebGLParameter({ param, value, onChange }: AnalysisWebGLParameterProps) {
  if (param.type === 'select') {
    return (
      <label className="analysis-label">
        {param.label}
        <select value={String(value)} onChange={(event) => onChange(event.target.value)}>
          {param.options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <label className="analysis-label">
      {param.label}
      <input
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={Number(value)}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>{String(value)}</output>
    </label>
  );
}

export function AnalysisWebGLConfig({ draft, onChange: setWebgl }: AnalysisWebGLConfigProps) {
  const webgl = WEBGL_PRESETS.find((preset) => preset.id === draft.presetId);
  return (
    <>
      <h3>WebGL</h3>
      <div className="analysis-scenes">
        {WEBGL_PRESETS.map((p) => (
          <button
            type="button"
            className="analysis-scene"
            aria-pressed={draft.presetId === p.id}
            key={p.id}
            onClick={() => setWebgl({ presetId: p.id })}
          >
            <img src={previews[p.id]} alt={`${p.name} preview`} width="160" height="120" />
            <strong>{p.name}</strong>
          </button>
        ))}
      </div>
      <details className="analysis-disclosure">
        <summary>WebGL settings</summary>
        <div className="analysis-fields">
          {webgl?.params.map((param) => (
            <AnalysisWebGLParameter
              key={param.id}
              param={param}
              value={draft.params[webgl.id]?.[param.id] ?? param.default}
              onChange={(value) =>
                setWebgl({
                  params: {
                    ...draft.params,
                    [webgl.id]: { ...draft.params[webgl.id], [param.id]: value },
                  },
                })
              }
            />
          ))}
        </div>
      </details>
      {draft.presetId === 'custom' && (
        <label className="analysis-label">
          Fragment shader (GLSL)
          <textarea
            aria-label="Fragment shader (GLSL)"
            className="analysis-code"
            rows={12}
            spellCheck={false}
            value={draft.customGlsl}
            onChange={(e) => setWebgl({ customGlsl: e.target.value })}
          />
        </label>
      )}
    </>
  );
}
