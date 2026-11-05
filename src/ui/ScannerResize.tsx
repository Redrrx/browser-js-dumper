import { useRef } from 'react';
import type { PointerEvent } from 'react';

type ResizeProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  percent?: boolean;
  className?: string;
  onChange: (value: number) => void;
};

export function ScannerResize({
  label,
  value,
  min,
  max,
  percent = false,
  className = '',
  onChange,
}: ResizeProps) {
  const drag = useRef<{ x: number; value: number; scale: number } | null>(null);

  function resize(next: number) {
    onChange(Math.max(min, Math.min(max, next)));
  }

  function start(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    const width = event.currentTarget.parentElement?.clientWidth ?? 1;
    let scale = 1;
    if (percent) scale = 100 / Math.max(1, width);
    drag.current = { x: event.clientX, value, scale };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const origin = drag.current;
    if (!origin) return;
    resize(origin.value + (event.clientX - origin.x) * origin.scale);
  }

  return (
    <div
      className={`scanner-resizer ${className}`}
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={(event) => {
        drag.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
      onKeyDown={(event) => {
        let step = 10;
        if (percent) step = 2;
        if (event.key === 'ArrowLeft') resize(value - step);
        else if (event.key === 'ArrowRight') resize(value + step);
        else if (event.key === 'Home') resize(min);
        else if (event.key === 'End') resize(max);
        else return;
        event.preventDefault();
      }}
    />
  );
}
