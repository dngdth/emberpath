import React from 'react';
import Konva from 'konva';
import { Group, Circle } from 'react-konva';
import { FloorPlanObject } from '../../../types/editor';
import { getDefaultSize } from '../../../utils/geometryHelpers';

interface PolygonVertexHandlesProps {
  targetObj: FloorPlanObject;
  stageRef: React.RefObject<Konva.Stage | null>;
  onUpdateObject: (id: string, patch: Partial<FloorPlanObject>) => void;
  onContextAction: (action: string, objectId: string) => void;
  fromNode?: FloorPlanObject;
  toNode?: FloorPlanObject;
}

function centerRelativeToWire(node: FloorPlanObject, wire: FloorPlanObject) {
  const size = getDefaultSize(node.type);
  return [
    node.x + (node.width ?? size.width) / 2 - wire.x,
    node.y + (node.height ?? size.height) / 2 - wire.y,
  ];
}

export const PolygonVertexHandles: React.FC<PolygonVertexHandlesProps> = React.memo(({
  targetObj,
  stageRef,
  onUpdateObject,
  onContextAction,
  fromNode,
  toNode,
}) => {
  const pts = [...(targetObj.points || [])];
  if (pts.length >= 4 && fromNode) {
    const [x, y] = centerRelativeToWire(fromNode, targetObj);
    pts[0] = x;
    pts[1] = y;
  }
  if (pts.length >= 4 && toNode) {
    const [x, y] = centerRelativeToWire(toNode, targetObj);
    pts[pts.length - 2] = x;
    pts[pts.length - 1] = y;
  }
  const isOpenLine = targetObj.type === 'led_wire' || targetObj.type === 'wall';
  const handles: JSX.Element[] = [];

  for (let i = 0; i < pts.length; i += 2) {
    const idx = i;
    const vx = pts[idx];
    const vy = pts[idx + 1];

    const isConnectedEndpoint = (idx === 0 && fromNode) || (idx === pts.length - 2 && toNode);

    // 1. Vertex Handle (blue circles)
    handles.push(
      <Circle
        key={`v-${idx}`}
        name={`v-${idx}-${targetObj.id}`}
        x={vx}
        y={vy}
        radius={7}
        fill={isConnectedEndpoint ? '#93c5fd' : '#3b82f6'}
        stroke="#ffffff"
        strokeWidth={2}
        draggable={!isConnectedEndpoint}
        onDragMove={(e) => {
          const newVx = e.target.x();
          const newVy = e.target.y();
          const nextPoints = [...pts];
          nextPoints[idx] = newVx;
          nextPoints[idx + 1] = newVy;
          
          const group = stageRef.current?.findOne(`#${targetObj.id}`);
          if (group instanceof Konva.Group) {
            const lines = group.find('Line');
            const arrows = group.find('Arrow');
            [...lines, ...arrows].forEach((line) => {
              if (line instanceof Konva.Line) {
                line.points(nextPoints);
              }
            });

            const clipGroup = group.getChildren().find(
              (child) => child instanceof Konva.Group
            );
            if (clipGroup instanceof Konva.Group) {
              clipGroup.clipFunc((ctx) => {
                if (nextPoints.length < 4) return;
                ctx.beginPath();
                ctx.moveTo(nextPoints[0], nextPoints[1]);
                for (let j = 2; j < nextPoints.length; j += 2) {
                  ctx.lineTo(nextPoints[j], nextPoints[j + 1]);
                }
                ctx.closePath();
              });
            }
          }

          // Update midpoint handles in real-time
          const stage = stageRef.current;
          if (stage) {
            const prevIdx = (idx - 2 + pts.length) % pts.length;
            const nextIdx = (idx + 2) % pts.length;

            const prevMidpoint = stage.findOne(`#m-${prevIdx}-${targetObj.id}`);
            if (prevMidpoint) {
              prevMidpoint.x((pts[prevIdx] + newVx) / 2);
              prevMidpoint.y((pts[prevIdx + 1] + newVy) / 2);
            }

            const currentMidpoint = stage.findOne(`#m-${idx}-${targetObj.id}`);
            if (currentMidpoint) {
              currentMidpoint.x((newVx + pts[nextIdx]) / 2);
              currentMidpoint.y((newVy + pts[nextIdx + 1]) / 2);
            }
          }

          if (group instanceof Konva.Group) {
            group.getLayer()?.batchDraw();
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

          const distPrev = (!isOpenLine || idx > 0)
            ? Math.hypot(newVx - pts[prevIdx], newVy - pts[prevIdx + 1])
            : Infinity;
          const distNext = (!isOpenLine || idx < pts.length - 2)
            ? Math.hypot(newVx - pts[nextIdx], newVy - pts[nextIdx + 1])
            : Infinity;

          // Overlap with adjacent vertices deletes the vertex
          if (distPrev < 15 || distNext < 15) {
            nextPoints.splice(idx, 2);
            const minPointsRequired = isOpenLine ? 4 : 6;
            if (nextPoints.length < minPointsRequired) {
              onContextAction('delete', targetObj.id);
              return;
            }
          }

          onUpdateObject(targetObj.id, { points: nextPoints });
        }}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = isConnectedEndpoint ? 'not-allowed' : 'move';
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'default';
        }}
      />
    );

    // 2. Midpoint Handle (green circles) - splits segment into new vertex
    if (!isOpenLine || idx < pts.length - 2) {
      const nextIdx = (idx + 2) % pts.length;
      const nvx = pts[nextIdx];
      const nvy = pts[nextIdx + 1];
      const mx = (vx + nvx) / 2;
      const my = (vy + nvy) / 2;

      handles.push(
        <Circle
          key={`m-${idx}`}
          id={`m-${idx}-${targetObj.id}`}
          x={mx}
          y={my}
          radius={5}
          fill="#10b981"
          stroke="#ffffff"
          strokeWidth={1.5}
          opacity={0.8}
          draggable
          onDragMove={(e) => {
            const newMx = e.target.x();
            const newMy = e.target.y();
            const nextPoints = [...pts];
            nextPoints.splice(idx + 2, 0, newMx, newMy);

            const group = stageRef.current?.findOne(`#${targetObj.id}`);
            if (group instanceof Konva.Group) {
              const lines = group.find('Line');
              const arrows = group.find('Arrow');
              [...lines, ...arrows].forEach((line) => {
                if (line instanceof Konva.Line) {
                  line.points(nextPoints);
                }
              });

              const clipGroup = group.getChildren().find(
                (child) => child instanceof Konva.Group
              );
              if (clipGroup instanceof Konva.Group) {
                clipGroup.clipFunc((ctx) => {
                  if (nextPoints.length < 4) return;
                  ctx.beginPath();
                  ctx.moveTo(nextPoints[0], nextPoints[1]);
                  for (let j = 2; j < nextPoints.length; j += 2) {
                    ctx.lineTo(nextPoints[j], nextPoints[j + 1]);
                  }
                  ctx.closePath();
                });
              }

              group.getLayer()?.batchDraw();
            }
          }}
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
  }

  return (
    <Group x={targetObj.x} y={targetObj.y}>
      {handles}
    </Group>
  );
});

PolygonVertexHandles.displayName = 'PolygonVertexHandles';
export default PolygonVertexHandles;
