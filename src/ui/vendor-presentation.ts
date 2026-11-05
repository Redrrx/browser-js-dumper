import { PIXELTELLS_CHANNELS, PIXELTELLS_MODELS } from '../analysis/pixeltells';
import type { PixelTellsResult } from '../analysis/pixeltells';
import type { VendorDetectionState } from '../application/vendor-detection';

const LABELS = {
  idle: { run: 'Not run', action: 'Run tests', pending: 'Not run' },
  running: { run: 'Running…', action: 'Running…', pending: 'Pending' },
  success: { run: 'Run succeeded', action: 'Run again', pending: 'No result' },
  invalid: { run: 'Run invalid', action: 'Run again', pending: 'No result' },
  failed: { run: 'Run failed', action: 'Run again', pending: 'No result' },
} as const;

function detectionSummary(result: PixelTellsResult | null): string {
  if (!result) return 'No detection yet';
  switch (result.verdict) {
    case 'Unknown':
      return 'No known formula matched';
    case 'Ambiguous': {
      const matches = result.scores.filter((score) => score.matches === PIXELTELLS_CHANNELS);
      return `Multiple matches: ${matches.map((score) => score.model).join(' / ')}`;
    }
    case 'Invalid':
      return 'Controls failed';
    case 'SwiftShader':
      return 'SwiftShader · software';
    default:
      return `${result.verdict} formula match`;
  }
}

function formulaSummary(result: PixelTellsResult): string {
  if (result.controls) return 'Invalid';
  const count = result.scores.filter((score) => score.matches === PIXELTELLS_CHANNELS).length;
  if (count === 0) return 'No match';
  if (count === 1) return '1 match';
  return `${count} matches`;
}

function testRows(result: PixelTellsResult | null, pending: string) {
  let format = pending;
  let controls = pending;
  let failures = '—';
  if (result) {
    format = 'Pass';
    controls = 'Pass';
    if (result.controls > 0) controls = 'Fail';
    failures = `${result.controls.toLocaleString()} invalid pixels`;
  }
  return [
    { test: 'Canvas2D format', result: format, detail: 'Opaque sRGB · 8-bit' },
    { test: 'Black / alpha', result: controls, detail: failures },
    ...PIXELTELLS_MODELS.map((model) => {
      const score = result?.scores.find((item) => item.model === model);
      let status = pending;
      let detail = '—';
      if (score) {
        status = 'No match';
        if (score.matches === PIXELTELLS_CHANNELS) status = 'Match';
        if (result?.controls) status = 'Invalid';
        detail = `${score.matches.toLocaleString()} / ${PIXELTELLS_CHANNELS.toLocaleString()} exact`;
      }
      return { test: model, result: status, detail };
    }),
  ];
}

export function vendorPresentation(state: VendorDetectionState) {
  const labels = LABELS[state.status];
  let formulas: string = labels.pending;
  if (state.result) formulas = formulaSummary(state.result);
  return {
    ...labels,
    formulas,
    testing: state.status === 'running',
    summary: detectionSummary(state.result),
    rows: testRows(state.result, labels.pending),
  };
}
