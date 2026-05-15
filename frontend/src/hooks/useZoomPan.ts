import { useCallback, useState } from 'react';

type Viewport = {
  width: number;
  height: number;
};

const BASE_CANVAS_WIDTH = 1600;
const BASE_CANVAS_HEIGHT = 1000;
const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;

export function useZoomPan() {
  const [scale, setScaleState] = useState(1);
  const [position, setPosition] = useState({ x: 140, y: 100 });

  const clampScale = useCallback((value: number) => {
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, Number(value.toFixed(3))));
  }, []);

  const getCenteredPosition = useCallback((nextScale: number, viewport?: Viewport) => {
    const safeViewport = viewport ?? { width: 1200, height: 800 };

    return {
      x: Math.round((safeViewport.width - BASE_CANVAS_WIDTH * nextScale) / 2),
      y: Math.round((safeViewport.height - BASE_CANVAS_HEIGHT * nextScale) / 2),
    };
  }, []);

  const zoomAroundViewportCenter = useCallback((delta: number, viewport?: Viewport) => {
    const safeViewport = viewport ?? { width: 1200, height: 800 };
    const nextScale = clampScale(scale + delta);

    const viewportCenter = {
      x: safeViewport.width / 2,
      y: safeViewport.height / 2,
    };

    const worldPoint = {
      x: (viewportCenter.x - position.x) / scale,
      y: (viewportCenter.y - position.y) / scale,
    };

    setScaleState(nextScale);
    setPosition({
      x: Math.round(viewportCenter.x - worldPoint.x * nextScale),
      y: Math.round(viewportCenter.y - worldPoint.y * nextScale),
    });
  }, [clampScale, position.x, position.y, scale]);

  const zoomIn = useCallback((viewport?: Viewport) => {
    zoomAroundViewportCenter(0.12, viewport);
  }, [zoomAroundViewportCenter]);

  const zoomOut = useCallback((viewport?: Viewport) => {
    zoomAroundViewportCenter(-0.12, viewport);
  }, [zoomAroundViewportCenter]);

  const resetView = useCallback((viewport?: Viewport) => {
    const nextScale = 1;
    setScaleState(nextScale);
    setPosition(getCenteredPosition(nextScale, viewport));
  }, [getCenteredPosition]);

  const fitView = useCallback((viewport?: Viewport) => {
    const safeViewport = viewport ?? { width: 1200, height: 800 };
    const nextScale = clampScale(
      Math.min(
        (safeViewport.width - 80) / BASE_CANVAS_WIDTH,
        (safeViewport.height - 80) / BASE_CANVAS_HEIGHT,
      ),
    );

    setScaleState(nextScale);
    setPosition(getCenteredPosition(nextScale, safeViewport));
  }, [clampScale, getCenteredPosition]);

  const centerView = useCallback((viewport?: Viewport) => {
    setPosition(getCenteredPosition(scale, viewport));
  }, [getCenteredPosition, scale]);

  return {
    scale,
    position,
    zoomIn,
    zoomOut,
    resetView,
    fitView,
    centerView,
    setScale: setScaleState,
    setPosition,
  };
}