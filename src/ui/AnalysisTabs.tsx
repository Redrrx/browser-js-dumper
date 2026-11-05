import type { KeyboardEvent } from 'react';

export type AnalysisTab = 'results' | 'config' | 'images';
export type AnalysisKind = 'gpu' | 'timing';
interface AnalysisTabsProps {
  kind: AnalysisKind;
  tab: AnalysisTab;
  onSelect: (tab: AnalysisTab) => void;
}
const LABELS = { results: 'Results', config: 'Configuration', images: 'Images' };

function moveTab(event: KeyboardEvent<HTMLButtonElement>) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const tabs = Array.from(
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
  );
  const index = tabs.indexOf(event.currentTarget);
  let next = 0;
  if (event.key === 'End') next = tabs.length - 1;
  if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
  if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
  tabs[next]?.focus();
  tabs[next]?.click();
}

export function AnalysisTabs({ kind, tab, onSelect }: AnalysisTabsProps) {
  let names: AnalysisTab[] = ['results'];
  if (kind === 'gpu') names = ['results', 'config', 'images'];
  return (
    <div className="analysis-tabs" role="tablist" aria-label="Analysis views">
      {names.map((name) => {
        const selected = tab === name || (kind === 'timing' && name === 'results');
        let tabIndex = -1;
        if (tab === name || kind === 'timing') tabIndex = 0;
        return (
          <button
            type="button"
            role="tab"
            id={`analysis-${kind}-${name}-tab`}
            aria-selected={selected}
            aria-controls={`analysis-${kind}-panel`}
            tabIndex={tabIndex}
            key={name}
            onKeyDown={moveTab}
            onClick={() => onSelect(name)}
          >
            {LABELS[name]}
          </button>
        );
      })}
    </div>
  );
}
