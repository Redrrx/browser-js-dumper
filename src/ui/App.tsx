import { useStore } from 'zustand';
import {
  appStore,
  BJSD,
  applyConfig,
  importEnvironment,
  reportError,
  selectView,
} from '../application/app';
import type { View } from '../application/app';
import { Scanner } from './Scanner';
import { Analysis } from './Analysis';
import { useAnalysisImport } from './useAnalysisImport';

const VIEWS: { id: View; label: string }[] = [
  { id: 'scan', label: 'Environment' },
  { id: 'gpu', label: 'GPU & canvas' },
  { id: 'timing', label: 'Timing' },
];

function ViewNavigation({ view }: { view: View }) {
  return (
    <nav className="app-navigation" aria-label="Analysis sections">
      {VIEWS.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={view === item.id}
          onClick={() => selectView(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export function App() {
  const view = useStore(appStore, (state) => state.view);
  const current = useStore(appStore, (state) => state.current);
  const imported = useStore(appStore, (state) => state.imported);
  const gpu = useStore(appStore, (state) => state.gpu);
  const timing = useStore(appStore, (state) => state.timing);
  const config = useStore(appStore, (state) => state.config);
  const busy = useStore(appStore, (state) => state.busy);
  const status = useStore(appStore, (state) => state.status);
  const error = useStore(appStore, (state) => state.error);
  const analysisImport = useAnalysisImport();
  const execute = (command: () => unknown | Promise<unknown>) => {
    try {
      void Promise.resolve(command()).catch(reportError);
    } catch (cause) {
      reportError(cause);
    }
  };

  const navigation = <ViewNavigation view={view} />;
  return (
    <div className="app-shell">
      <main>
        <div className="app-view" hidden={view !== 'scan'}>
          <Scanner
            current={current}
            imported={imported}
            busy={busy}
            status={status}
            navigation={view === 'scan' && navigation}

            onScan={() => execute(BJSD.scan)}
            onImport={(text) => {
              try {
                importEnvironment(text);
              } catch (cause) {
                reportError(cause);
              }
            }}
            onExport={() => execute(() => BJSD.download('env'))}
            onDump={() =>
              execute(async () => {
                await BJSD.dumpAll();
                BJSD.download('all');
              })
            }
          />
        </div>
        <div className="app-view app-analysis-view" hidden={view !== 'gpu'}>
          <Analysis
            kind="gpu"
            imported={analysisImport}
            navigation={view === 'gpu' && navigation}
            gpu={gpu}
            timing={timing}
            config={config}
            busy={busy}

            onRun={(nextConfig) =>
              execute(() => {
                if (nextConfig) applyConfig(nextConfig);
                return BJSD.runGPU();
              })
            }
            onExport={() => execute(() => BJSD.download('gpu'))}
          />
        </div>
        <div className="app-view app-analysis-view" hidden={view !== 'timing'}>
          <Analysis
            kind="timing"
            imported={analysisImport}
            navigation={view === 'timing' && navigation}
            gpu={gpu}
            timing={timing}
            config={config}
            busy={busy}

            onRun={() => execute(BJSD.runTiming)}
            onExport={() => execute(() => BJSD.download('timing'))}
          />
        </div>
      </main>
      {error && (
        <div className="app-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => appStore.setState({ error: null })}>
            Dismiss
          </button>
        </div>
      )}
      {view !== 'scan' && (
        <div className="app-status" role="status" aria-live="polite">
          {busy && 'Working · '}
          {status}
        </div>
      )}
    </div>
  );
}
