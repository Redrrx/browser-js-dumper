import { z } from 'zod';
import type { LegacyEntry, SceneImages } from '../measurement/gpu';
import { formatResultValues } from './format';
import { MAX_PNG_URL_LENGTH, validatePNGHeader } from './png-header';
import type { TimeDisplayUnit } from './format';
import { renderSuiteSize } from '../measurement/gpu/render-suite';
import type { RenderBackend } from '../measurement/gpu/render-suite-types';
export { numeric, unitFor } from './format';

const entry = z.object({
  type: z.enum(['integer', 'float', 'string']),
  display: z.string().max(100_000),
});
const entries = z.record(z.string(), entry);
const png = z
  .string()
  .max(MAX_PNG_URL_LENGTH)
  .superRefine((source, context) => {
    try {
      validatePNGHeader(source);
    } catch (error) {
      let message = 'Invalid PNG header';
      if (error instanceof Error) message = error.message;
      context.addIssue({ code: 'custom', message });
    }
  });
function renderingPNG(backend: RenderBackend) {
  const expected = renderSuiteSize(backend);
  return png.pipe(
    z.string().refine((source) => {
      const actual = validatePNGHeader(source);
      return actual.width === expected.width && actual.height === expected.height;
    }, `Invalid ${backend} rendering baseline v1 dimensions`),
  );
}
const images = z
  .object({
    webgl_grid: png.optional(),
    canvas_grid: png.optional(),
    webgl_primitives_v1: renderingPNG('webgl').optional(),
    canvas_primitives_v1: renderingPNG('canvas').optional(),
    shapes_grid: png.optional(),
    subpixel: png.optional(),
    aa_pattern: png.optional(),
    aa: png.optional(),
  })
  .strict();
const object = z.record(z.string(), z.unknown());
export interface ImportedAnalysis {
  gpu: Map<string, LegacyEntry>;
  timing: Map<string, LegacyEntry>;
  images: SceneImages;
}

export function parseAnalysisImport(value: unknown): ImportedAnalysis {
  const root = object.parse(value);
  const result: ImportedAnalysis = { gpu: new Map(), timing: new Map(), images: {} };
  function read(raw: unknown, expected?: 'gpu' | 'timing') {
    const data = object.parse(raw);
    if (data.__meta__ !== undefined) {
      const meta = object.parse(data.__meta__);
      if (
        meta.mode !== undefined &&
        !['benchmark', 'gpu', 'timing', 'combined', 'analysis', 'all'].includes(String(meta.mode))
      )
        throw new Error('Not a GPU/timing analysis export');
    }
    let source = data.entries;
    if (source === undefined) {
      source = Object.fromEntries(
        Object.entries(data).filter(
          ([key]) => key.startsWith('bench.') || key.startsWith('timing.'),
        ),
      );
    }
    const checked = entries.parse(source);
    for (const [key, item] of Object.entries(checked)) {
      if (key.startsWith('bench.') && expected !== 'timing') result.gpu.set(key, item);
      else if (key.startsWith('timing.') && expected !== 'gpu') result.timing.set(key, item);
      else throw new Error(`Unexpected analysis key: ${key}`);
    }
    const imageData = data.__images__ ?? data.images;
    if (imageData !== undefined) {
      const { aa, ...checkedImages } = images.parse(imageData);
      const canonical = { ...checkedImages, aa_pattern: checkedImages.aa_pattern ?? aa };
      const definedImages = Object.fromEntries(
        Object.entries(canonical).filter((pair): pair is [string, string] => pair[1] !== undefined),
      );
      result.images = { ...result.images, ...definedImages };
    }
  }
  read(root);
  if (root.gpu !== undefined && root.gpu !== null) read(root.gpu, 'gpu');
  if (root.benchmark !== undefined && root.benchmark !== null) read(root.benchmark, 'gpu');
  if (root.timing !== undefined && root.timing !== null) read(root.timing, 'timing');
  const isEmptyAllExport =
    object.safeParse(root.__meta__).data?.mode === 'all' && ('gpu' in root || 'timing' in root);
  if (
    !result.gpu.size &&
    !result.timing.size &&
    !Object.keys(result.images).length &&
    !isEmptyAllExport
  )
    throw new Error('No supported analysis entries or images found');
  return result;
}

export interface ResultRow {
  key: string;
  current: string;
  imported: string;
  delta: string;
  unit: string;
}
export function resultRows(
  current: Map<string, LegacyEntry>,
  imported: Map<string, LegacyEntry>,
  display: TimeDisplayUnit = 'ms',
): ResultRow[] {
  return [...new Set([...current.keys(), ...imported.keys()])].sort().map((key) => ({
    key,
    ...formatResultValues(key, current.get(key), imported.get(key), display),
  }));
}
