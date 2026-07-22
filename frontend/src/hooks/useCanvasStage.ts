import React, { useState, useEffect, useCallback } from 'react';
import Konva from 'konva';

interface UseCanvasStageProps {
  scale: number;
  position: { x: number; y: number };
  onStageChange: (patch: { scale?: number; position?: { x: number; y: number } }) => void;
  onViewportChange?: (viewport: { width: number; height: number }) => void;
  activeTool: string;
  editMode: boolean;
  drawingState: any;
  cancelDrawing: () => void;
  stageRef: React.RefObject<Konva.Stage | null>;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}

export function useCanvasStage({
  scale,
  position,
  onStageChange,
  onViewportChange,
  activeTool,
  editMode,
  drawingState,
  cancelDrawing,
  stageRef,
  wrapperRef,
}: UseCanvasStageProps) {
  const [viewport, setViewport] = useState({ width: 1200, height: 760 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [panOrigin, setPanOrigin] = useState<{ x: number; y: number } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Key event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true');
      if (e.code === 'Space' && !isInput) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
      if (e.code === 'Escape') {
        if (drawingState) {
          cancelDrawing();
          e.preventDefault();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    const handleBlur = () => {
      setIsSpacePressed(false);
      cancelDrawing();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [drawingState, cancelDrawing]);

  // Viewport resize observer
  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;

    const updateViewport = () => {
      const next = {
        width: node.clientWidth,
        height: node.clientHeight,
      };
      setViewport(next);
      onViewportChange?.(next);
    };

    updateViewport();

    const observer = new ResizeObserver(updateViewport);
    observer.observe(node);

    return () => observer.disconnect();
  }, [onViewportChange, wrapperRef]);

  const startPan = useCallback((clientX: number, clientY: number) => {
    setIsPanning(true);
    setPanStart({ x: clientX, y: clientY });
    setPanOrigin({ x: position.x, y: position.y });
  }, [position]);

  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    if (e.evt.ctrlKey) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const scaleBy = 1.05;
      const oldScale = scale;
      const nextScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clampedScale = Math.max(0.3, Math.min(3, nextScale));

      const mousePointTo = {
        x: (pointer.x - position.x) / oldScale,
        y: (pointer.y - position.y) / oldScale,
      };

      onStageChange({
        scale: clampedScale,
        position: {
          x: pointer.x - mousePointTo.x * clampedScale,
          y: pointer.y - mousePointTo.y * clampedScale,
        },
      });
    } else {
      let dx = e.evt.deltaX;
      let dy = e.evt.deltaY;

      // Shift + scroll scrolls horizontally
      if (e.evt.shiftKey && dx === 0) {
        dx = dy;
        dy = 0;
      }

      onStageChange({
        position: {
          x: position.x - dx,
          y: position.y - dy,
        },
      });
    }
  }, [scale, position, onStageChange, stageRef]);

  const handleStagePanningMove = useCallback((event: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning && panStart && panOrigin) {
      const dx = event.evt.clientX - panStart.x;
      const dy = event.evt.clientY - panStart.y;

      onStageChange({
        position: {
          x: panOrigin.x + dx,
          y: panOrigin.y + dy,
        },
      });
      return true;
    }
    return false;
  }, [isPanning, panStart, panOrigin, onStageChange]);

  const handleStagePanningUp = useCallback(() => {
    setIsPanning(false);
    setPanStart(null);
    setPanOrigin(null);
  }, []);

  return {
    viewport,
    isPanning,
    isSpacePressed,
    startPan,
    handleWheel,
    handleStagePanningMove,
    handleStagePanningUp,
  };
}
