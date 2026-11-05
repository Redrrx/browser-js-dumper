import type { CanvasText } from '../measurement/gpu';

interface AnalysisCanvasTextsProps {
  texts: CanvasText[];
  onChange: (texts: CanvasText[]) => void;
}

export function AnalysisCanvasTexts({ texts, onChange }: AnalysisCanvasTextsProps) {
  function updateText(index: number, patch: Partial<CanvasText>) {
    onChange(
      texts.map((text, row) => {
        if (row === index) return { ...text, ...patch };
        return text;
      }),
    );
  }
  return (
    <>
      {texts.map((text, index) => (
        <div className="analysis-text-row" key={index}>
          <label className="analysis-label">
            Text {index + 1}
            <input
              value={text.text}
              onChange={(event) => updateText(index, { text: event.target.value })}
            />
          </label>
          <label className="analysis-label">
            CSS font {index + 1}
            <input
              value={text.font}
              onChange={(event) => updateText(index, { font: event.target.value })}
            />
          </label>
          <button
            type="button"
            aria-label={`Remove text ${index + 1}`}
            onClick={() => onChange(texts.filter((_, row) => row !== index))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={texts.length >= 5}
        onClick={() => onChange([...texts, { text: 'Sample text', font: '16px sans-serif' }])}
      >
        Add text row
      </button>
    </>
  );
}
