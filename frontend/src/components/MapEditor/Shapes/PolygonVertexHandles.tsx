import React from 'react';
import Konva from 'konva';
import { Group, Circle } from 'react-konva';
import { FloorPlanObject } from '../../../types/editor';

interface PolygonVertexHandlesProps {
  targetObj: FloorPlanObject;
  stageRef: React.RefObject<Konva.Stage | null>;
  onUpdateObject: (id: string, patch: Partial<FloorPlanObject>) => void;
  onContextAction: (action: string, objectId: string) => void;
}

export const PolygonVertexHandles: React.FC<PolygonVertexHandlesProps> = React.memo(({
  targetObj,
  stageRef,
  onUpdateObject,
  onContextAction,
}) => {
  const pts = targetObj.points || [];
  const handles: JSX.Element[] = [];

  for (let i = 0; i < pts.length; i += 2) {
    const idx = i;
    const vx = pts[idx];
    const vy = pts[idx + 1];

    // 1. Vertex Handle (blue circles)
    handles.push(
      <Circle
        key={`v-${idx}`}
        x={vx}
        y={vy}
        radius={7}
        fill="#3b82f6"
        stroke="#ffffff"
        strokeWidth={2}
        draggable
        onDragMove={(e) => {
          const nextPoints = [...pts];
          nextPoints[idx] = e.target.x();
          nextPoints[idx + 1] = e.target.y();
          const shape = stageRef.current?.findOne(`#${targetObj.id}-polygon`);
          if (shape instanceof Konva.Line) {
            shape.points(nextPoints);
            shape.getLayer()?.batchDraw();
          }
        }}
        onDragEnd={(e) => {
          const newVx = e.target.x();
          const newVy = e.target.y();
          let nextPoints = [...pts];
          nextPoints[idx] = newVx;
          nextPoints[idx + 1] = newVy;

          const prevIdx = (idx - 2 + pts.length) % pts.length;
          const nextIdx = (idx + 2) % pts.length;

          const distPrev = Math.hypot(newVx - pts[prevIdx], newVy - pts[prevIdx + 1]);
          const distNext = Math.hypot(newVx - pts[nextIdx], newVy - pts[nextIdx + 1]);

          // Overlap with adjacent vertices deletes the vertex
          if (distPrev < 15 || distNext < 15) {
            nextPoints.splice(idx, 2);
            if (nextPoints.length < 6) {
              onContextAction('delete', targetObj.id);
              return;
            }
          }

          onUpdateObject(targetObj.id, { points: nextPoints });
        }}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'move';
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'default';
        }}
      />
    );

    // 2. Midpoint Handle (green circles) - splits segment into new vertex
    const nextIdx = (idx + 2) % pts.length;
    const nvx = pts[nextIdx];
    const nvy = pts[nextIdx + 1];
    const mx = (vx + nvx) / 2;
    const my = (vy + nvy) / 2;

    handles.push(
      <Circle
        key={`m-${idx}`}
        x={mx}
        y={my}
        radius={5}
        fill="#10b981"
        stroke="#ffffff"
        strokeWidth={1.5}
        opacity={0.8}
        draggable
        onDragEnd={(e) => {
          const newMx = e.target.x();
          const newMy = e.target.y();
          const nextPoints = [...pts];
          nextPoints.splice(idx + 2, 0, newMx, newMy);
          onUpdateObject(targetObj.id, { points: nextPoints });
        }}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'pointer';
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'default';
        }}
      />
    );
  }

  return (
    <Group x={targetObj.x} y={targetObj.y}>
      {handles}
    </Group>
  );
});

PolygonVertexHandles.displayName = 'PolygonVertexHandles';
export default PolygonVertexHandles;
