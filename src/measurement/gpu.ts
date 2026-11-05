export { defaultConfig } from './gpu/config';
export {
  WEBGL_PRESETS,
  CANVAS_PRESETS,
  CANVAS_LAYER_DEFS,
  DEFAULT_TEXT_STRINGS,
} from './gpu/scenes';
export { PREVIEWS } from './gpu/previews';
export { runGPU, runTiming } from './gpu/engine';
export { gpuToEntries, timingToEntries } from './gpu/entries';
export type {
  AnalysisConfig,
  WebGLPreset,
  CanvasPreset,
  PresetParam,
  CanvasLayers,
  CanvasText,
  LegacyEntry,
  SceneImages,
  SceneImageKey,
  JsonValue,
  JsonObject,
} from './gpu/types';
export type { GPUResults } from './gpu/engine';
export type { TimingResults } from './gpu/timing-types';
