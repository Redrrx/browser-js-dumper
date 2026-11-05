import { useState } from 'react';
import type { ReactNode } from 'react';
import type { AnalysisConfig as Config, SceneImages, TimingResults } from '../measurement/gpu';
import type { GPUCapture } from '../application/app';
import type { TimeDisplayUnit } from '../analysis/format';

import { AnalysisRunDialog } from './AnalysisRunDialog';
import { AnalysisImport } from './AnalysisImport';
import { AnalysisResults } from './AnalysisResults';
import { AnalysisScenes } from './AnalysisScenes.js';

import { ImageComparison } from './ImageComparison';
import { VendorDetection } from './VendorDetection';
import { RenderingSuite } from './RenderingSuite';
import type { useAnalysisImport } from './useAnalysisImport';
import './analysis.css';

const EMPTY_IMAGES: SceneImages = {};

export interface AnalysisProps {
  kind: 'gpu' | 'timing';
  imported: ReturnType<typeof useAnalysisImport>;
  gpu: GPUCapture | null;
  timing: TimingResults | null;
  config: Config;
  busy: boolean;

  onRun: (config?: Config) => void;
  onExport: () => void;
  navigation?: ReactNode;
}

export function Analysis({
  kind,
  imported,
  gpu,
  timing,
  config,
  busy,

  onRun,
  onExport,
  navigation,
}: AnalysisProps) {
  const [choosingScenes, setChoosingScenes] = useState(false);
  const [query, setQuery] = useState('');
  const [timeUnit, setTimeUnit] = useState<TimeDisplayUnit>('ms');
  let label = 'Timing';
  let title = 'Timing analysis';
  let runLabel = 'Run timing analysis';
  let hasResults = Boolean(timing);

  if (kind === 'gpu') {
    label = 'GPU';
    title = 'GPU & canvas analysis';
    runLabel = '▶ Run GPU analysis…';
    hasResults = Boolean(gpu);
  }
  if (busy) runLabel = 'Running…';

  let scenes: ReactNode = null;
  if (kind === 'gpu') {
    if (gpu) scenes = <AnalysisScenes config={config} images={gpu.images} />;
    if (imported.comparison) {
      scenes = (
        <ImageComparison
          current={gpu?.images ?? EMPTY_IMAGES}
          imported={imported.comparison.images}
        />
      );
    }
  }

  let measurements: ReactNode = null;
  if (hasResults || imported.comparison) {
    measurements = (
      <AnalysisResults
        kind={kind}
        gpu={gpu}
        timing={timing}
        comparison={imported.comparison}
        query={query}
        onQuery={setQuery}
        timeUnit={timeUnit}
        onTimeUnit={setTimeUnit}
      />
    );
  }

  function requestRun() {
    if (kind === 'gpu') {
      setChoosingScenes(true);
      return;
    }
    onRun();
  }

  return (
    <section className="analysis-root" aria-label={`${label} analysis`}>
      <header className="analysis-header">{navigation}</header>
      <div className="analysis-header">
        <h1>{title}</h1>
        <div className="analysis-actions">
          <button type="button" className="analysis-primary" disabled={busy} onClick={requestRun}>
            {runLabel}
          </button>
          <button type="button" disabled={busy || !hasResults} onClick={onExport}>
            Export current JSON
          </button>
          <AnalysisImport {...imported} />
        </div>
      </div>
      <div className="analysis-panel">
        {kind === 'gpu' && (
          <div className="analysis-gpu-overview">
            <div className="analysis-gpu-scenes">{scenes}</div>
            <VendorDetection />
          </div>
        )}
        {kind === 'gpu' && <RenderingSuite gpu={gpu} imported={imported.comparison?.gpu} />}
        {measurements}
      </div>
      {choosingScenes && (
        <AnalysisRunDialog
          config={config}
          busy={busy}
          onCancel={() => setChoosingScenes(false)}
          onStart={(draft) => {
            setChoosingScenes(false);

            onRun(draft);
          }}
        />
      )}
    </section>
  );
}
export default Analysis;
