export type ParamValue = number | string;
export interface RangeParam {
  id: string;
  label: string;
  type: 'range';
  min: number;
  max: number;
  step: number;
  default: number;
}
export interface SelectParam {
  id: string;
  label: string;
  type: 'select';
  options: string[];
  default: string;
}
export type PresetParam = RangeParam | SelectParam;
export interface WebGLPreset {
  id: string;
  name: string;
  desc: string;
  tags: string[];
  params: PresetParam[];
  buildFs: ((params: Record<string, ParamValue>) => string) | null;
}
export interface CanvasLayers {
  linearGradientBg: boolean;
  radialGradientBlobs: boolean;
  arcs: boolean;
  beziers: boolean;
  shadowBlur: boolean;
  screenComposite: boolean;
  text: boolean;
}
export interface CanvasText {
  text: string;
  font: string;
}
export interface CanvasPreset {
  id: string;
  name: string;
  desc: string;
  tags: string[];
  canvasSize?: number;
  defaultLayers?: CanvasLayers;
  defaultTextStrings?: CanvasText[];
  render?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  emojiTest?: () => number;
}
export interface AnalysisConfig {
  webgl: {
    presetId: string;
    params: Record<string, Record<string, ParamValue>>;
    customGlsl: string;
  };
  canvas: { presetId: string; layers: CanvasLayers; texts: CanvasText[] };
}
export interface LegacyEntry {
  type: 'integer' | 'float' | 'string';
  display: string;
}
export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };
export type SceneImageKey =
  | 'webgl_grid'
  | 'canvas_grid'
  | 'shapes_grid'
  | 'subpixel'
  | 'aa_pattern'
  | 'webgl_primitives_v1'
  | 'canvas_primitives_v1';
export type SceneImages = Readonly<Partial<Record<SceneImageKey, string>>>;
