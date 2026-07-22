import React, { useState, useEffect, useCallback } from 'react';
import Konva from 'konva';
import { FloorPlanObject } from '../types/editor';

interface UseEraserToolProps {
  activeTool: string;
  editMode: boolean;
  objects: FloorPlanObject[];
  onContextAction: (action: string, objectId: string) => void;
  stageRef: React.RefObject<Konva.Stage | null>;
}

export function useEraserTool({
  activeTool,
  editMode,
  objects,
  onContextAction,
  stageRef,
}: UseEraserToolProps) {
  const [isErasing, setIsErasing] = useState(false);
  const [erasedIds, setErasedIds] = useState<Set<string>>(new Set());

  // Reset state when active tool changes
  useEffect(() => {
    setIsErasing(false);
    setErasedIds(new Set());
  }, [activeTool]);

  const getObjectIdsAtPointer = useCallback((stage: Konva.Stage, screenPos: { x: number; y: number }) => {
    const ids = new Set<string>();
    const offsets = [
      { x: 0, y: 0 },
      { x: -8, y: 0 },
      { x: 8, y: 0 },
      { x: 0, y: -8 },
      { x: 0, y: 8 },
    ];

    for (const offset of offsets) {
      const intersect = stage.getIntersection({ x: screenPos.x + offset.x, y: screenPos.y + offset.y });
      if (intersect) {
        let current: Konva.Container | Konva.Node | null = intersect;
        while (current) {
          const id = current.id();
          if (id && objects.some((obj) => obj.id === id && !obj.locked)) {
            ids.add(id);
            break;
          }
          current = current.getParent();
        }
      }
    }
    return Array.from(ids);
  }, [objects]);

  const handleEraserMouseDown = useCallback((isPanningAction: boolean, button: number) => {
    if (editMode && activeTool === 'eraser' && button === 0 && !isPanningAction) {
      setIsErasing(true);
      const stage = stageRef.current;
      if (stage) {
        const screenPointer = stage.getPointerPosition();
        if (screenPointer) {
          const hitIds = getObjectIdsAtPointer(stage, screenPointer);
          if (hitIds.length > 0) {
            setErasedIds(new Set(hitIds));
          }
        }
      }
      return true;
    }
    return false;
  }, [editMode, activeTool, stageRef, getObjectIdsAtPointer]);

  const handleEraserMouseMove = useCallback(() => {
    if (editMode && activeTool === 'eraser' && isErasing) {
      const stage = stageRef.current;
      if (stage) {
        const screenPointer = stage.getPointerPosition();
        if (screenPointer) {
          const hitIds = getObjectIdsAtPointer(stage, screenPointer);
          if (hitIds.length > 0) {
            setErasedIds((prev) => {
              const next = new Set(prev);
              hitIds.forEach((id) => {
                const obj = objects.find((o) => o.id === id);
                if (obj && !obj.locked) {
                  next.add(id);
                }
              });
              return next;
            });
          }
        }
      }
      return true;
    }
    return false;
  }, [editMode, activeTool, isErasing, stageRef, objects, getObjectIdsAtPointer]);

  const handleEraserMouseUp = useCallback(() => {
    if (isErasing) {
      setIsErasing(false);
      if (erasedIds.size > 0) {
        onContextAction('delete_multiple', JSON.stringify(Array.from(erasedIds)));
      }
      setErasedIds(new Set());
      return true;
    }
    return false;
  }, [isErasing, erasedIds, onContextAction]);

  return {
    isErasing,
    erasedIds,
    handleEraserMouseDown,
    handleEraserMouseMove,
    handleEraserMouseUp,
  };
}
