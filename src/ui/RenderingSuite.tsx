import type { GPUCapture } from '../application/app';
import type { LegacyEntry } from '../measurement/gpu';
import { RENDER_CASES } from '../measurement/gpu/render-suite';
import { renderCaseKey } from '../measurement/gpu/render-suite-data';
import { RENDER_COLUMNS } from '../measurement/gpu/render-suite-types';
import type { RenderBackend, RenderSuiteReport } from '../measurement/gpu/render-suite-types';

interface RenderingSuiteProps {
  gpu: GPUCapture | null;
  imported: ReadonlyMap<string, LegacyEntry> | undefined;
}
function SuiteTable({
  backend,
  report,
  imported,
}: {
  backend: RenderBackend;
  report: RenderSuiteReport | null | undefined;
  imported: ReadonlyMap<string, LegacyEntry> | undefined;
}) {
  const cases = RENDER_CASES[backend];
  let label = 'WebGL';
  if (backend === 'canvas') label = 'Canvas 2D';
  return (
    <section className="analysis-suite-section">
      <h3>
        {label} · {cases.length} tests
      </h3>
      <section
        className="analysis-suite-scroll"
        tabIndex={0}
        aria-label={`${label} rendering test statuses`}
      >
        <table className="analysis-suite-table">
          <thead>
            <tr>
              <th>Test · tile row:column</th>
              <th>Current machine</th>
              <th>Imported</th>
              <th>RGBA hash</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((recipe, index) => {
              const current = report?.cases[recipe.id];
              const key = renderCaseKey(backend, recipe.id);
              const previous = imported?.get(`${key}.status`)?.display;
              const hash = imported?.get(`${key}.hash`)?.display;
              let difference = '—';
              if (
                current?.status === 'Captured' &&
                previous === 'Captured' &&
                current.hash &&
                hash
              ) {
                difference = 'Different';
                if (current.hash === hash) difference = 'Same';
              }
              return (
                <tr key={recipe.id}>
                  <th scope="row">
                    {Math.floor(index / RENDER_COLUMNS) + 1}:{(index % RENDER_COLUMNS) + 1} ·{' '}
                    {recipe.label}
                  </th>
                  <td title={current?.detail} data-missing={!current} data-state={current?.status}>
                    {current?.status ?? '—'}
                  </td>
                  <td
                    title={imported?.get(`${key}.detail`)?.display}
                    data-missing={!previous}
                    data-state={previous}
                  >
                    {previous ?? '—'}
                  </td>
                  <td data-changed={difference === 'Different'} data-missing={difference === '—'}>
                    {difference}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </section>
  );
}
export function RenderingSuite({ gpu, imported }: RenderingSuiteProps) {
  return (
    <details className="analysis-render-suite">
      <summary>
        Rendering test list · v1 · {RENDER_CASES.canvas.length} Canvas 2D /{' '}
        {RENDER_CASES.webgl.length} WebGL
      </summary>
      <p className="analysis-note">
        Runs automatically with every GPU capture, independently of the template. Each tile is 128 ×
        128 pixels; coordinates are row:column, starting at 1. Captured means executed, not
        identical or correct. Unsupported and failed tests leave blank tiles; see capture notes in
        Values. Hashes cover sRGB RGBA readback, not PNG bytes.
      </p>
      <div className="analysis-result-tables">
        <SuiteTable backend="canvas" report={gpu?.results.canvas_primitives} imported={imported} />
        <SuiteTable backend="webgl" report={gpu?.results.webgl_primitives} imported={imported} />
      </div>
    </details>
  );
}
