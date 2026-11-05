import type { AnalysisConfig, SceneImages, SceneImageKey } from './types';
import { benchRenderWebGLWithConfig, benchRenderCanvas2DWithConfig } from './config';
import { Resources, benchGetPixels, benchRollingHash, YIELD } from './resources';
import { benchPrecisionMatrix, benchFPTests, benchFloatReadback, benchTextureSample } from './core';
import * as probes from './probes';
import { benchPerfTimings, runTimingBenchmark } from './timing';
import { runRenderingSuite } from './render-suite';
import type { RenderBackend } from './render-suite-types';

export async function runGPU(config: AnalysisConfig, onProgress?: (message: string) => void) {
  const cfg = structuredClone(config);
  const errors: Record<string, string> = {};
  const images: Partial<Record<SceneImageKey, string>> = {};
  const step = async <T>(
    label: string,
    operation: (scope: Resources) => T | Promise<T>,
  ): Promise<T | null> => {
    onProgress?.(label + '…');
    await YIELD();
    const scope = new Resources();
    try {
      return await operation(scope);
    } catch (error) {
      errors[label] = String(error);
      return null;
    } finally {
      scope.dispose();
    }
  };
  const scene = (
    key: SceneImageKey,
    render: (scope: Resources, canvas: HTMLCanvasElement) => boolean,
  ) =>
    step(key, (scope) => {
      const canvas = scope.canvas();
      if (!render(scope, canvas)) {
        errors[key] = 'Context unavailable or shader compilation/link failed';
        return null;
      }
      const hash = benchRollingHash(benchGetPixels(canvas));
      images[key] = canvas.toDataURL('image/png');
      return hash;
    });
  const baseline = (backend: RenderBackend, key: SceneImageKey) =>
    step(`${backend} rendering baseline`, async (scope) => {
      const captured = await runRenderingSuite(backend, scope, onProgress);
      images[key] = captured.image;
      return captured.report;
    });
  const canvas_primitives = await baseline('canvas', 'canvas_primitives_v1');
  const webgl_primitives = await baseline('webgl', 'webgl_primitives_v1');
  const precision = await step('precision matrix', benchPrecisionMatrix);
  const highp = await step('highp tests', (scope) => benchFPTests(scope, 'highp'));
  const mediump = await step('mediump tests', (scope) => benchFPTests(scope, 'mediump'));
  const webgl_hash = await scene('webgl_grid', (scope, canvas) =>
    benchRenderWebGLWithConfig(scope, canvas, cfg),
  );
  const webgl_float = await step('float readback', (scope) => {
    const data = benchFloatReadback(scope);
    if (!data) return null;
    return Array.from(data);
  });
  const canvas_hash = await scene('canvas_grid', (_scope, canvas) =>
    benchRenderCanvas2DWithConfig(canvas, cfg),
  );
  const shapes_hash = await scene('shapes_grid', probes.benchRenderShapes);
  const texture = await step('texture sample', benchTextureSample);
  const perf = await step('performance timings', benchPerfTimings);
  const readpixels = await step('readPixels throughput', probes.benchReadPixelsThroughput);
  const subpixel = await step('subpixel fill-rule', probes.benchSubpixelRaster);
  if (subpixel?.dataURL) images.subpixel = subpixel.dataURL;
  const aa_pattern = await step('AA pattern', probes.benchAAPattern);
  if (aa_pattern?.dataURL) images.aa_pattern = aa_pattern.dataURL;
  const colorspace = await step('color space', probes.benchColorSpace);
  const offscreen = await step('OffscreenCanvas', probes.benchOffscreenCanvas);
  const frame_timing = await step('frame timing', probes.benchFrameTiming);
  const blend = await step('blend precision', probes.benchBlendPrecision);
  const varying = await step('varying interp', probes.benchVaryingInterp);
  const texfilter = await step('texture filter', probes.benchTexFilterPrecision);
  const derivative = await step('derivatives', probes.benchDerivativePrecision);
  const depth = await step('depth precision', probes.benchDepthPrecision);
  const stencil = await step('stencil edge', probes.benchStencilEdge);
  const msaa = await step('MSAA resolve', probes.benchMSAAPositions);
  onProgress?.('done');
  return {
    results: {
      canvas_primitives,
      webgl_primitives,
      precision,
      highp,
      mediump,
      webgl_hash,
      webgl_float,
      canvas_hash,
      shapes_hash,
      texture,
      perf,
      readpixels,
      subpixel,
      aa_pattern,
      colorspace,
      offscreen,
      frame_timing,
      blend,
      varying,
      texfilter,
      derivative,
      depth,
      stencil,
      msaa,
      errors,
    },
    images: Object.freeze(images) as SceneImages,
  };
}
export type GPUResults = Awaited<ReturnType<typeof runGPU>>['results'];

export async function runTiming(onProgress?: (message: string) => void) {
  const scope = new Resources();
  try {
    const results = await runTimingBenchmark(scope, onProgress);
    onProgress?.('done');
    return results;
  } finally {
    scope.dispose();
  }
}
