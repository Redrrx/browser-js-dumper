import { useForm } from '@tanstack/react-form';
import type { AnalysisConfig as Config } from '../measurement/gpu';
import { AnalysisWebGLConfig } from './AnalysisWebGLConfig';
import { AnalysisCanvasConfig } from './AnalysisCanvasConfig';
import './analysis.css';

export interface AnalysisConfigProps {
  config: Config;
  busy?: boolean;
  onApply: (config: Config) => void;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
}

function validateDraft(value: Config) {
  if (value.webgl.presetId === 'custom' && !value.webgl.customGlsl.trim()) {
    return 'Custom GLSL cannot be empty.';
  }
  if (value.canvas.texts.some((text) => !text.font.trim())) {
    return 'Each text row needs a CSS font.';
  }
  return undefined;
}

export function AnalysisConfig({
  config,
  busy = false,
  onApply,
  onCancel,
  submitLabel = 'Apply configuration',
  cancelLabel = 'Cancel draft',
}: AnalysisConfigProps) {
  const form = useForm({
    defaultValues: { draft: structuredClone(config) },
    onSubmit: ({ value }) => onApply(structuredClone(value.draft)),
  });
  return (
    <form
      className="analysis-config"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!busy) void form.handleSubmit();
      }}
    >
      <fieldset disabled={busy} className="analysis-fieldset">
        <form.Field
          name="draft"
          validators={{
            onChange: ({ value }) => validateDraft(value),
            onSubmit: ({ value }) => validateDraft(value),
          }}
        >
          {(field) => {
            const draft = field.state.value;
            return (
              <>
                <AnalysisWebGLConfig
                  draft={draft.webgl}
                  onChange={(patch) =>
                    field.handleChange({ ...draft, webgl: { ...draft.webgl, ...patch } })
                  }
                />
                <AnalysisCanvasConfig
                  draft={draft.canvas}
                  onChange={(patch) =>
                    field.handleChange({ ...draft, canvas: { ...draft.canvas, ...patch } })
                  }
                />
                {field.state.meta.errors.map((error, index) => (
                  <p className="analysis-error" role="alert" key={index}>
                    {String(error)}
                  </p>
                ))}
              </>
            );
          }}
        </form.Field>
      </fieldset>
      <div className="analysis-actions">
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <button className="analysis-primary" type="submit" disabled={busy || !canSubmit}>
              {submitLabel}
            </button>
          )}
        </form.Subscribe>
        <button type="button" onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </form>
  );
}
export default AnalysisConfig;
