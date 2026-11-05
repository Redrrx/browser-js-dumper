import { memo } from 'react';
import type { CSSProperties } from 'react';
import type { SceneImageKey } from '../measurement/gpu';
import { ImageViewport } from './ImageViewport';

export interface ImageSize {
  width: number;
  height: number;
}
interface ImagePreviewProps {
  scene: SceneImageKey;
  aSource: string | undefined;
  bSource: string | undefined;
  aSize: ImageSize | undefined;
  bSize: ImageSize | undefined;
  mismatch: boolean;
  zoom: number;
  split: number;
  onSplit: (split: number) => void;
  onLoad: (source: string, image: HTMLImageElement) => void;
  onError: (message: string) => void;
}

function ImageWipe({
  scene,
  aSource,
  bSource,
  aSize,
  bSize,
  zoom,
  split,
  onSplit,
  onLoad,
  onError,
}: ImagePreviewProps) {
  const size = aSize ?? bSize;
  const width = (size?.width ?? 0) * zoom;
  const height = (size?.height ?? 0) * zoom;
  const currentStyle: CSSProperties = { visibility: 'hidden' };
  const importedStyle: CSSProperties = { visibility: 'hidden' };
  let className = 'analysis-wipe';
  if (size) {
    className += ' analysis-wipe-sized';
    currentStyle.visibility = 'visible';
    importedStyle.visibility = 'visible';
    const boundary = (size.width * split) / 100;
    if (bSource) currentStyle.clip = `rect(0px, ${boundary}px, ${size.height}px, 0px)`;
    if (aSource) importedStyle.clip = `rect(0px, ${size.width}px, ${size.height}px, ${boundary}px)`;
  }
  return (
    <ImageViewport
      width={width}
      height={height}
      resetKey={scene}
      label={`${scene} comparison preview`}
    >
      <div className="analysis-wipe-surface" style={{ width, height }}>
        <div
          className={className}
          style={{ width: size?.width, height: size?.height, transform: `scale(${zoom})` }}
        >
          {aSource && (
            <img
              className="analysis-original"
              src={aSource}
              alt={`Current ${scene}`}
              onLoad={(event) => onLoad(aSource, event.currentTarget)}
              onError={() => onError('Current PNG could not be loaded')}
              style={currentStyle}
            />
          )}
          {bSource && (
            <img
              className="analysis-original"
              src={bSource}
              alt={`Imported ${scene}`}
              onLoad={(event) => onLoad(bSource, event.currentTarget)}
              onError={() => onError('Imported PNG could not be loaded')}
              style={importedStyle}
            />
          )}
        </div>
        {aSource && bSource && size && (
          <span className="analysis-wipe-line" style={{ left: `${split}%` }} />
        )}
        {aSource && bSource && size && (
          <input
            className="analysis-wipe-slider"
            aria-label={`${scene} comparison slider`}
            aria-valuetext={`${split}% current, ${100 - split}% imported`}
            type="range"
            min="0"
            max="100"
            step="1"
            value={split}
            onChange={(event) => onSplit(Number(event.target.value))}
          />
        )}
      </div>
    </ImageViewport>
  );
}

function ImageSeparate({ scene, aSource, bSource, aSize, bSize, zoom }: ImagePreviewProps) {
  const images = [
    { source: aSource, size: aSize, label: 'Current' },
    { source: bSource, size: bSize, label: 'Imported' },
  ];
  return (
    <div className="analysis-separate">
      {images.map(({ source, size, label }) => {
        if (!source || !size) return null;
        const width = size.width * zoom;
        const height = size.height * zoom;
        return (
          <figure key={label}>
            <figcaption>{label}</figcaption>
            <ImageViewport
              width={width}
              height={height}
              resetKey={scene}
              label={`${label} ${scene}`}
            >
              <img src={source} alt={`${label} ${scene}`} width={width} height={height} />
            </ImageViewport>
          </figure>
        );
      })}
    </div>
  );
}

export const ImagePreview = memo(function ImagePreview(props: ImagePreviewProps) {
  const { aSource, bSource, aSize, bSize, mismatch } = props;
  let preview = <ImageWipe {...props} />;
  if (mismatch) preview = <ImageSeparate {...props} />;
  return (
    <>
      {mismatch && aSize && bSize && (
        <p role="alert" className="analysis-error">
          Size mismatch: {aSize.width}×{aSize.height} / {bSize.width}×{bSize.height}.
        </p>
      )}
      {!aSource && <p>No current image.</p>}
      {!bSource && <p>No imported image.</p>}
      {preview}
    </>
  );
});
