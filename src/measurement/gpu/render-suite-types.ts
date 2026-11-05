import type { Resources } from './resources';

export const RENDER_SUITE_VERSION = 1;
export const RENDER_TILE_SIZE = 128;
export const RENDER_COLUMNS = 8;
export type RenderBackend = 'canvas' | 'webgl';
export type RenderStatus = 'Captured' | 'Unsupported' | 'Error';
export interface RenderCase {
  id: string;
  label: string;
  draw: (scope: Resources) => HTMLCanvasElement;
}
export interface RenderCaseResult {
  status: RenderStatus;
  detail?: string;
  hash?: string;
  coloredPixels?: number;
  partialAlphaPixels?: number;
  colors?: number;
}
export interface RenderSuiteReport {
  version: number;
  cases: Record<string, RenderCaseResult>;
}
export class UnsupportedRenderFeature extends Error {
  override name = 'UnsupportedRenderFeature';
}
