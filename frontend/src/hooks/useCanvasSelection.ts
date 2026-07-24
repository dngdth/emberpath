import React, { useMemo, useEffect } from 'react';
import Konva from 'konva';
import { FloorPlanObject } from '../types/editor';
import { isResizable } from '../utils/geometryHelpers';

interface UseCanvasSelectionProps {
  objects: FloorPlanObject[];
  selectedIds: string[];
  stageRef: React.RefObject<Konva.Stage | null>;
  transformerRef: React.RefObject<Konva.Transformer | null>;
}

export function useCanvasSelection({
  objects,
  selectedIds,
  stageRef,
  transformerRef,
}: UseCanvasSelectionProps) {
  const selectedObjects = useMemo(
    () => objects.filter((object) => selectedIds.includes(object.id)),
    [objects, selectedIds],
  );

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const resizeEnabled = selectedObjects.length === 1 && isResizable(selectedObjects[0].type);

  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    const nodes = selectedIds
      .map((id) => stageRef.current?.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[];

    // Do not attach transformer box around polygon floor bases / rooms to let handles stand out clearly
    const activeNodes = nodes.filter((node) => {
      const obj = objects.find((o) => o.id === node.id());
      return !(obj?.shapeType === 'polygon');
    });

    transformerRef.current.nodes(activeNodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedIds, objects, stageRef, transformerRef]);

  return {
    selectedObjects,
    selectedIdSet,
    resizeEnabled,
  };
}
