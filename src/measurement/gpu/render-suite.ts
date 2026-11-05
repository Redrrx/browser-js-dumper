import { CANVAS_PATH_CASES } from './render-canvas-paths';
import { CANVAS_PAINT_CASES } from './render-canvas-paint';
import { WEBGL_PATH_CASES } from './render-webgl-paths';
import { WEBGL_TEXTURE_CASES } from './render-webgl-textures';
import { Resources, benchGetPixels, YIELD } from './resources';
import {
  RENDER_COLUMNS,
  RENDER_SUITE_VERSION,
  RENDER_TILE_SIZE,
  UnsupportedRenderFeature,
} from './render-suite-types';
import type {
  RenderBackend,
  RenderCase,
  RenderCaseResult,
  RenderSuiteReport,
} from './render-suite-types';

const canvasCases: readonly RenderCase[] = [...CANVAS_PATH_CASES, ...CANVAS_PAINT_CASES].map(
  (recipe) => ({
    id: recipe.id,
    label: recipe.label,
    draw(scope) {
      const canvas = scope.canvas();
      canvas.width = RENDER_TILE_SIZE;
      canvas.height = RENDER_TILE_SIZE;
      const ctx = canvas.getContext('2d', { colorSpace: 'srgb', ...recipe.settings });
      if (!ctx) throw new UnsupportedRenderFeature('Canvas2D unavailable');
      if (typeof ctx.getContextAttributes !== 'function')
        throw new UnsupportedRenderFeature('Canvas2D attribute verification unavailable');
      const attributes = ctx.getContextAttributes();
      if (
        attributes.colorSpace !== (recipe.settings?.colorSpace ?? 'srgb') ||
        attributes.alpha !== (recipe.settings?.alpha ?? true)
      )
        throw new UnsupportedRenderFeature('Requested Canvas2D attributes unavailable');
      ctx.fillStyle = '#2baed7';
      ctx.strokeStyle = '#e54b75';
      ctx.lineWidth = 2;
      recipe.draw(ctx);
      return canvas;
    },
  }),
);
const webglCases: readonly RenderCase[] = [...WEBGL_PATH_CASES, ...WEBGL_TEXTURE_CASES].map(
  (recipe) => ({
    id: recipe.id,
    label: recipe.label,
    draw(scope) {
      const canvas = scope.canvas();
      canvas.width = RENDER_TILE_SIZE;
      canvas.height = RENDER_TILE_SIZE;
      const antialias = recipe.antialias ?? false;
      const premultipliedAlpha = recipe.premultipliedAlpha ?? false;
      const gl = scope.gl(canvas, recipe.api ?? 'webgl', {
        alpha: true,
        antialias,
        premultipliedAlpha,
        depth: true,
        stencil: true,
        preserveDrawingBuffer: true,
      });
      if (!gl) throw new UnsupportedRenderFeature(`${recipe.api ?? 'webgl'} context unavailable`);
      const attributes = gl.getContextAttributes();
      if (
        !attributes ||
        attributes.antialias !== antialias ||
        attributes.premultipliedAlpha !== premultipliedAlpha
      )
        throw new UnsupportedRenderFeature('Requested WebGL context attributes unavailable');
      if (antialias && gl.getParameter(gl.SAMPLES) < 2)
        throw new UnsupportedRenderFeature('Multisampled default framebuffer unavailable');
      gl.viewport(0, 0, RENDER_TILE_SIZE, RENDER_TILE_SIZE);
      gl.clearColor(0, 0, 0, 0);
      gl.clearDepth(1);
      gl.clearStencil(0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
      recipe.draw(gl);
      const error = gl.getError();
      if (gl.isContextLost() || error !== gl.NO_ERROR)
        throw new Error(`WebGL render failed (error ${error})`);
      return canvas;
    },
  }),
);
export const RENDER_CASES: Readonly<Record<RenderBackend, readonly RenderCase[]>> = {
  canvas: canvasCases,
  webgl: webglCases,
};
export function renderSuiteSize(backend: RenderBackend) {
  return {
    width: RENDER_COLUMNS * RENDER_TILE_SIZE,
    height: Math.ceil(RENDER_CASES[backend].length / RENDER_COLUMNS) * RENDER_TILE_SIZE,
  };
}
export function renderCasePosition(index: number) {
  return {
    x: (index % RENDER_COLUMNS) * RENDER_TILE_SIZE,
    y: Math.floor(index / RENDER_COLUMNS) * RENDER_TILE_SIZE,
  };
}
export function renderPixelStats(pixels: Uint8ClampedArray) {
  if (pixels.length !== RENDER_TILE_SIZE * RENDER_TILE_SIZE * 4)
    throw new Error('Invalid rendering tile readback');
  let coloredPixels = 0;
  let partialAlphaPixels = 0;
  const colors = new Set<number>();
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    const a = pixels[i + 3]!;
    if (a > 0 && (r > 0 || g > 0 || b > 0)) coloredPixels++;
    if (a > 0 && a < 255) partialAlphaPixels++;
    colors.add((r << 24) | (g << 16) | (b << 8) | a);
  }
  return { coloredPixels, partialAlphaPixels, colors: colors.size };
}
async function fingerprint(
  pixels: Uint8ClampedArray,
): Promise<Pick<RenderCaseResult, 'hash' | 'detail'>> {
  if (!globalThis.crypto?.subtle) return { detail: 'SHA-256 unavailable; compare captured pixels' };
  try {
    const hash = await crypto.subtle.digest('SHA-256', new Uint8Array(pixels));
    return {
      hash: Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join(''),
    };
  } catch {
    return { detail: 'SHA-256 unavailable; compare captured pixels' };
  }
}
async function captureCase(
  recipe: RenderCase,
  target: CanvasRenderingContext2D,
  index: number,
): Promise<RenderCaseResult> {
  const scope = new Resources();
  const position = renderCasePosition(index);
  try {
    const source = recipe.draw(scope);
    const pixels = benchGetPixels(source);
    target.putImageData(
      new ImageData(new Uint8ClampedArray(pixels), RENDER_TILE_SIZE, RENDER_TILE_SIZE),
      position.x,
      position.y,
    );
    const captured = target.getImageData(
      position.x,
      position.y,
      RENDER_TILE_SIZE,
      RENDER_TILE_SIZE,
    ).data;
    return { status: 'Captured', ...renderPixelStats(captured), ...(await fingerprint(captured)) };
  } catch (error) {
    target.clearRect(position.x, position.y, RENDER_TILE_SIZE, RENDER_TILE_SIZE);
    let status: RenderCaseResult['status'] = 'Error';
    if (error instanceof UnsupportedRenderFeature) status = 'Unsupported';
    return { status, detail: String(error) };
  } finally {
    scope.dispose();
  }
}
export async function runRenderingSuite(
  backend: RenderBackend,
  scope: Resources,
  progress?: (message: string) => void,
) {
  const atlas = scope.canvas();
  Object.assign(atlas, renderSuiteSize(backend));
  const target = atlas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
  if (!target) throw new Error('Rendering atlas Canvas2D unavailable');
  const report: RenderSuiteReport = { version: RENDER_SUITE_VERSION, cases: {} };
  for (const [index, recipe] of RENDER_CASES[backend].entries()) {
    progress?.(
      `${backend} primitives ${index + 1}/${RENDER_CASES[backend].length} · ${recipe.label}`,
    );
    await YIELD();
    report.cases[recipe.id] = await captureCase(recipe, target, index);
  }
  return { report, image: atlas.toDataURL('image/png') };
}
