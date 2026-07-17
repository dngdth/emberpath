import { useState, useCallback, useEffect } from 'react';
import { FloorPlanObject } from '../types/editor';
import { createNewObject } from '../data/initialMockData';

export type PenDrawingType = 'floor_base' | 'led_wire' | 'wall';

export interface DrawingState {
  type: PenDrawingType;
  startX: number;
  startY: number;
  points: number[]; // coordinates relative to (startX, startY)
}

export function usePenDrawing(
  activeTool: string,
  onAddCustomObject: ((obj: FloorPlanObject) => void) | undefined,
  onAddObject: (type: any, x: number, y: number) => void,
  onSelect: (id: string, append: boolean) => void,
  onCancel: () => void
) {
  const [drawingState, setDrawingState] = useState<DrawingState | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const cancelDrawing = useCallback(() => {
    setDrawingState(null);
    setMousePos(null);
    onCancel();
  }, [onCancel]);

  const finishDrawing = useCallback((closePolygon = true) => {
    if (!drawingState) return;

    // Closed polygons require at least 3 vertices (6 coordinates)
    // Open polylines (e.g. led_wire) require at least 2 vertices (4 coordinates)
    const minCoords = closePolygon ? 6 : 4;
    if (drawingState.points.length < minCoords) {
      cancelDrawing();
      return;
    }

    let points = [...drawingState.points];
    const baseType = drawingState.type;

    // For open lines (like led_wire), double-clicks append an extra point at the end.
    // Let's remove the last point if it is duplicate or very close to the previous one.
    const isOpenLine = baseType === 'led_wire' || baseType === 'wall';
    if (isOpenLine && points.length >= 6) {
      const len = points.length;
      const lx = points[len - 2];
      const ly = points[len - 1];
      const px = points[len - 4];
      const py = points[len - 3];
      if (Math.hypot(lx - px, ly - py) < 15) {
        points = points.slice(0, len - 2);
      }
    }

    // Find bounding box to make points local to the object's origin (minX, minY)
    let minX = Infinity;
    let minY = Infinity;
    for (let i = 0; i < points.length; i += 2) {
      const px = drawingState.startX + points[i];
      const py = drawingState.startY + points[i + 1];
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
    }

    const relativePoints: number[] = [];
    for (let i = 0; i < points.length; i += 2) {
      relativePoints.push(drawingState.startX + points[i] - minX);
      relativePoints.push(drawingState.startY + points[i + 1] - minY);
    }

    const newObj = createNewObject(baseType + '-pen', minX, minY);
    newObj.points = relativePoints;
    
    // Set shapeType to polygon for Konva compatibility
    newObj.shapeType = 'polygon';

    if (onAddCustomObject) {
      onAddCustomObject(newObj);
    } else {
      onAddObject(newObj.type, minX, minY);
    }

    setDrawingState(null);
    setMousePos(null);
    onSelect(newObj.id, false);
    onCancel();
  }, [drawingState, cancelDrawing, onAddCustomObject, onAddObject, onSelect, onCancel]);

  const handleCanvasClick = useCallback((pointerX: number, pointerY: number, button = 0) => {
    const isPenTool = activeTool === 'floor_base-pen' || activeTool === 'led_wire-pen' || activeTool === 'wall-pen';
    if (!isPenTool) return false;

    const mapToolType: PenDrawingType = 
      activeTool === 'floor_base-pen' ? 'floor_base' : 
      activeTool === 'led_wire-pen' ? 'led_wire' : 'wall';

    const isOpenLine = mapToolType === 'led_wire' || mapToolType === 'wall';

    if (button === 2) {
      // Right click finishes drawing (very handy for open lines like led_wire/wire)
      if (drawingState) {
        finishDrawing(!isOpenLine);
        return true;
      }
      return false;
    }

    if (!drawingState) {
      setDrawingState({
        type: mapToolType,
        startX: pointerX,
        startY: pointerY,
        points: [0, 0],
      });
    } else {
      const dx = pointerX - drawingState.startX;
      const dy = pointerY - drawingState.startY;

      if (isOpenLine) {
        const len = drawingState.points.length;
        const lx = drawingState.points[len - 2];
        const ly = drawingState.points[len - 1];
        const distToLast = Math.hypot(dx - lx, dy - ly);
        
        // Clicking close to the last point finishes drawing (22px radius is user friendly)
        if (distToLast < 22 && len >= 4) {
          finishDrawing(false);
          return true;
        }

        setDrawingState({
          ...drawingState,
          points: [...drawingState.points, dx, dy],
        });
      } else {
        // Closed polygons
        const distToStart = Math.hypot(dx, dy);
        if (distToStart < 22 && drawingState.points.length >= 6) {
          finishDrawing(true);
          return true;
        }

        setDrawingState({
          ...drawingState,
          points: [...drawingState.points, dx, dy],
        });
      }
    }
    return true;
  }, [activeTool, drawingState, finishDrawing]);

  const handleCanvasDblClick = useCallback(() => {
    if (drawingState) {
      const isOpenLine = drawingState.type === 'led_wire' || drawingState.type === 'wall';
      finishDrawing(!isOpenLine);
      return true;
    }
    return false;
  }, [drawingState, finishDrawing]);

  const undoLastPoint = useCallback(() => {
    if (!drawingState) return;
    const len = drawingState.points.length;
    if (len <= 2) {
      cancelDrawing();
    } else {
      setDrawingState({
        ...drawingState,
        points: drawingState.points.slice(0, len - 2),
      });
    }
  }, [drawingState, cancelDrawing]);

  const handleMouseMove = useCallback((pointerX: number, pointerY: number) => {
    if (drawingState) {
      setMousePos({ x: pointerX, y: pointerY });
    }
  }, [drawingState]);

  // Escape key cancels, Enter key finishes, Ctrl+Z undos last point
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!drawingState) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.stopImmediatePropagation();
        undoLastPoint();
        return;
      }
      if (e.key === 'Escape') {
        cancelDrawing();
        e.preventDefault();
      } else if (e.key === 'Enter') {
        const isOpenLine = drawingState.type === 'led_wire' || drawingState.type === 'wall';
        finishDrawing(!isOpenLine);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [drawingState, cancelDrawing, finishDrawing, undoLastPoint]);

  // Auto-finish or cancel if active tool switches away from pen tools
  useEffect(() => {
    const isPenTool = activeTool === 'floor_base-pen' || activeTool === 'led_wire-pen' || activeTool === 'wall-pen';
    if (!isPenTool && drawingState) {
      const isOpenLine = drawingState.type === 'led_wire' || drawingState.type === 'wall';
      const minCoords = isOpenLine ? 4 : 6;
      if (drawingState.points.length >= minCoords) {
        finishDrawing(!isOpenLine);
      } else {
        cancelDrawing();
      }
    }
  }, [activeTool, drawingState, finishDrawing, cancelDrawing]);

  return {
    drawingState,
    mousePos,
    handleCanvasClick,
    handleCanvasDblClick,
    handleMouseMove,
    cancelDrawing,
    finishDrawing,
    undoLastPoint,
  };
}
