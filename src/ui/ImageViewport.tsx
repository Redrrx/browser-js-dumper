import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import type { ReactZoomPanPinchContentRef } from 'react-zoom-pan-pinch';

export interface ImageViewportProps {
  width: number;
  height: number;
  label: string;
  resetKey?: string;
  children: ReactNode;
}

const excluded = ['input', 'button', 'select', 'textarea', 'a'];

export function ImageViewport({ width, height, label, resetKey, children }: ImageViewportProps) {
  const controls = useRef<ReactZoomPanPinchContentRef>(null);
  const viewport = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (width > 0 && height > 0) void controls.current?.centerView(1, 0);
  }, [width, height, resetKey]);

  return (
    <div ref={viewport} className="analysis-image-scroll analysis-interactive-viewport">
      <TransformWrapper
        ref={controls}
        minScale={0.25}
        maxScale={16}
        centerOnInit
        centerZoomedOut
        smooth={false}
        wheel={{ step: 0.1, excluded }}
        panning={{ velocityDisabled: true, excluded }}
        pinch={{ excluded }}
        keyboard={{ disabled: false, panStep: 40, zoomStep: 0.25, animationTime: 0, excluded }}
        doubleClick={{ mode: 'reset', animationTime: 0, excluded }}
        zoomAnimation={{ disabled: true }}
        autoAlignment={{ animationTime: 0, velocityAlignmentTime: 0 }}
        onTransform={(_ref, state) => {
          viewport.current?.style.setProperty('--viewport-scale', String(state.scale));
        }}
      >
        <TransformComponent
          wrapperClass="analysis-viewport-wrapper"
          contentClass="analysis-viewport-stage"
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ width, height }}
          wrapperProps={{
            role: 'region',
            'aria-label': label,
            title:
              'Wheel or pinch to zoom · Drag or arrow keys to pan · Double-click or Home to reset',
            onKeyDown: (event) => {
              if (
                event.key !== 'Home' ||
                event.target !== event.currentTarget ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey
              )
                return;
              event.preventDefault();
              void controls.current?.resetTransform(0);
            },
          }}
        >
          {children}
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
