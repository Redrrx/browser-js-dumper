import { z } from 'zod';
import { defaultConfig, WEBGL_PRESETS, CANVAS_PRESETS } from '../measurement/gpu';
import type { AnalysisConfig } from '../measurement/gpu';

const configKey = 'bjsd:config:v1';
const configSchema = z.object({
  webgl: z.object({
    presetId: z.string(),
    customGlsl: z.string().max(100_000),
    params: z.record(z.string(), z.record(z.string(), z.union([z.string(), z.number().finite()]))),
  }),
  canvas: z.object({
    presetId: z.string(),
    layers: z.object({
      linearGradientBg: z.boolean(),
      radialGradientBlobs: z.boolean(),
      arcs: z.boolean(),
      beziers: z.boolean(),
      shadowBlur: z.boolean(),
      screenComposite: z.boolean(),
      text: z.boolean(),
    }),
    texts: z
      .array(z.object({ text: z.string().max(10_000), font: z.string().min(1).max(500) }))
      .max(5),
  }),
});
export function validateConfig(value: unknown): AnalysisConfig {
  const config = configSchema.parse(value);
  if (
    !WEBGL_PRESETS.some((p) => p.id === config.webgl.presetId) ||
    !CANVAS_PRESETS.some((p) => p.id === config.canvas.presetId)
  )
    throw new Error('Unknown scene preset');
  return config;
}
export function loadConfig(): AnalysisConfig {
  const defaults = defaultConfig();
  try {
    const stored = localStorage.getItem(configKey) ?? localStorage.getItem('benchConfig');
    if (!stored) return defaults;
    const partial = z
      .object({
        webgl: configSchema.shape.webgl.partial().optional(),
        canvas: configSchema.shape.canvas.partial().optional(),
      })
      .parse(JSON.parse(stored) as unknown);
    return validateConfig({
      webgl: {
        ...defaults.webgl,
        ...partial.webgl,
        params: Object.fromEntries(
          Object.entries(defaults.webgl.params).map(([id, params]) => [
            id,
            { ...params, ...partial.webgl?.params?.[id] },
          ]),
        ),
      },
      canvas: {
        ...defaults.canvas,
        ...partial.canvas,
        layers: { ...defaults.canvas.layers, ...partial.canvas?.layers },
      },
    });
  } catch {
    return defaults;
  }
}
export function saveConfig(config: AnalysisConfig) {
  localStorage.setItem(configKey, JSON.stringify(config));
}
