import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzePixels } from '../analysis/pixels';
import type { AnalysisMode, Pixels } from '../analysis/pixels';
import type { ComparisonModifiers } from '../analysis/similarity';
import { decodePNG, visualPNG } from '../analysis/png';

const PAIR_CACHE_LIMIT = 4;

interface DecodedPair {
  aSource: string;
  bSource: string;
  pixels: Promise<[Pixels, Pixels]>;
}

export interface ImageAnalysisOutput {
  aSource: string;
  bSource: string;
  url: string;
  metrics: Record<string, number>;
  mode: AnalysisMode;
  sensitivity: number;
  modifiers: ComparisonModifiers;
  width: number;
  height: number;
}

type AnalysisSettings = Pick<ImageAnalysisOutput, 'mode' | 'sensitivity' | 'modifiers'>;

interface AnalysisFailure {
  aSource: string | undefined;
  bSource: string | undefined;
  message: string;
  request?: AnalysisSettings;
}

function matchesSettings(
  request: AnalysisSettings,
  mode: AnalysisMode,
  sensitivity: number,
  modifiers: ComparisonModifiers,
): boolean {
  return (
    request.mode === mode && request.sensitivity === sensitivity && request.modifiers === modifiers
  );
}

export function useImageAnalysis(
  aSource: string | undefined,
  bSource: string | undefined,
  mismatch: boolean,
  mode: AnalysisMode,
  sensitivity: number,
  modifiers: ComparisonModifiers,
) {
  const decoded = useRef<DecodedPair[]>([]);
  const [outputs, setOutputs] = useState<ImageAnalysisOutput[]>([]);
  const output = outputs.find((item) => item.aSource === aSource && item.bSource === bSource);
  const [failure, setFailure] = useState<AnalysisFailure | null>(null);
  const setError = useCallback(
    (message: string) => {
      setFailure({ aSource, bSource, message });
    },
    [aSource, bSource],
  );

  useEffect(() => {
    if (!aSource || !bSource || mismatch) return;
    if (output && matchesSettings(output, mode, sensitivity, modifiers)) return;
    const controller = new AbortController();
    const { signal } = controller;

    let pair = decoded.current.find((item) => item.aSource === aSource && item.bSource === bSource);
    if (!pair) {
      const a = decodePNG(aSource);
      let b = a;
      if (aSource !== bSource) b = decodePNG(bSource);
      pair = { aSource, bSource, pixels: Promise.all([a, b]) };
    }
    const activePair = pair;
    decoded.current = [activePair, ...decoded.current.filter((item) => item !== activePair)].slice(
      0,
      PAIR_CACHE_LIMIT,
    );

    async function analyze() {
      try {
        const [a, b] = await activePair.pixels;
        if (signal.aborted) return;
        const visual = analyzePixels(a, b, mode, sensitivity, modifiers);
        const url = visualPNG(visual);
        const image = new Image();
        image.src = url;
        await image.decode();
        if (signal.aborted) return;
        setFailure(null);
        const next: ImageAnalysisOutput = {
          aSource: activePair.aSource,
          bSource: activePair.bSource,
          url,
          metrics: visual.metrics,
          mode,
          sensitivity,
          modifiers,
          width: visual.width,
          height: visual.height,
        };
        setOutputs((previous) =>
          [
            next,
            ...previous.filter(
              (item) => item.aSource !== next.aSource || item.bSource !== next.bSource,
            ),
          ].slice(0, PAIR_CACHE_LIMIT),
        );
      } catch (cause) {
        if (signal.aborted) return;
        decoded.current = decoded.current.filter((item) => item !== activePair);
        let message = 'Could not analyze PNG images';
        if (cause instanceof Error) message = cause.message;
        setFailure({
          aSource: activePair.aSource,
          bSource: activePair.bSource,
          request: { mode, sensitivity, modifiers },
          message,
        });
      }
    }

    void analyze();
    return () => controller.abort();
  }, [aSource, bSource, mismatch, mode, sensitivity, modifiers, output]);

  let error = '';
  const request = failure?.request;
  const matchesRequest = !request || matchesSettings(request, mode, sensitivity, modifiers);
  if (failure && failure.aSource === aSource && failure.bSource === bSource && matchesRequest)
    error = failure.message;
  let shown: ImageAnalysisOutput | null = null;
  if (!mismatch && output) shown = output;
  const updating = Boolean(
    aSource &&
    bSource &&
    !mismatch &&
    !error &&
    (!shown || !matchesSettings(shown, mode, sensitivity, modifiers)),
  );

  return { shown, updating, error, setError };
}
