import { useState, useCallback, useEffect } from 'react';
import { FloorPlanObject } from '../types/editor';
import { createNewObject } from '../data/initialMockData';

export type PenDrawingType = 'floor_base' | 'room' | 'led_wire';

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

    // Find bounding box to make points local to the object's origin (minX, minY)
    let minX = Infinity;
    let minY = Infinity;
    for (let i = 0; i < drawingState.points.length; i += 2) {
      const px = drawingState.startX + drawingState.points[i];
      const py = drawingState.startY + drawingState.points[i + 1];
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
    }

    const relativePoints: number[] = [];
    for (let i = 0; i < drawingState.points.length; i += 2) {
      relativePoints.push(drawingState.startX + drawingState.points[i] - minX);
      relativePoints.push(drawingState.startY + drawingState.points[i + 1] - minY);
    }

    const baseType = drawingState.type;
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
    const isPenTool = activeTool === 'room-pen' || activeTool === 'floor_base-pen' || activeTool === 'led_wire-pen';
    if (!isPenTool) return false;

    const mapToolType: PenDrawingType = 
      activeTool === 'room-pen' ? 'room' : 
      activeTool === 'floor_base-pen' ? 'floor_base' : 'led_wire';

    if (button === 2) {
      // Right click finishes drawing (very handy for open lines like led_wire)
      if (drawingState) {
        finishDrawing(mapToolType !== 'led_wire');
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

      if (mapToolType === 'led_wire') {
        const len = drawingState.points.length;
        const lx = drawingState.points[len - 2];
        const ly = drawingState.points[len - 1];
        const distToLast = Math.hypot(dx - lx, dy - ly);
        
        // Clicking very close to the last point acts as a finish command
        if (distToLast < 10 && len >= 4) {
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
        if (distToStart < 12 && drawingState.points.length >= 6) {
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

  const handleMouseMove = useCallback((pointerX: number, pointerY: number) => {
    if (drawingState) {
      setMousePos({ x: pointerX, y: pointerY });
    }
  }, [drawingState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!drawingState) return;
      if (e.key === 'Escape') {
        cancelDrawing();
        e.preventDefault();
      } else if (e.key === 'Enter') {
        finishDrawing(drawingState.type !== 'led_wire');
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingState, cancelDrawing, finishDrawing]);

  return {
    drawingState,
    mousePos,
    handleCanvasClick,
    handleMouseMove,
    cancelDrawing,
    finishDrawing,
  };
}
