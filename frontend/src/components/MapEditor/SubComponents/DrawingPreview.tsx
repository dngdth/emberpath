import React from 'react';
import { Group, Line, Circle } from 'react-konva';

interface DrawingPreviewProps {
  drawingState: any;
  mousePos: { x: number; y: number } | null;
  guideLines: any[];
  scale: number;
}

export const DrawingPreview: React.FC<DrawingPreviewProps> = React.memo(({
  drawingState,
  mousePos,
  guideLines,
  scale,
}) => {
  if (!drawingState || !mousePos) return null;

  return (
    <>
      <Group x={drawingState.startX} y={drawingState.startY}>
        <Line
          points={[
            ...drawingState.points,
            mousePos.x - drawingState.startX,
            mousePos.y - drawingState.startY,
          ]}
          stroke="#3b82f6"
          strokeWidth={drawingState.type === 'led_wire' || drawingState.type === 'wall' ? 3.5 : 2}
          dash={[4, 4]}
        />
        {/* Closed polygon start indicator */}
        {drawingState.type !== 'led_wire' &&
          drawingState.type !== 'wall' &&
          drawingState.points.length >= 6 &&
          Math.hypot(mousePos.x - drawingState.startX, mousePos.y - drawingState.startY) < 12 && (
            <Circle
              x={0}
              y={0}
              radius={8}
              fill="rgba(16, 185, 129, 0.5)"
              stroke="#10b981"
              strokeWidth={2}
            />
          )}
        {/* Open path node connector snap preview indicator */}
        {(drawingState.type === 'led_wire' || drawingState.type === 'wall') && (
          <Circle
            x={mousePos.x - drawingState.startX}
            y={mousePos.y - drawingState.startY}
            radius={5}
            fill="#3b82f6"
          />
        )}
      </Group>

      {/* Render drawing guide lines (snapped axes) */}
      {guideLines &&
        guideLines.map((guide, idx) => (
          <Line
            key={`guide-${idx}`}
            points={guide.points}
            stroke="#10b981"
            strokeWidth={1.5 / scale}
            dash={[6, 4]}
            opacity={0.7}
            listening={false}
          />
        ))}
    </>
  );
});

DrawingPreview.displayName = 'DrawingPreview';
export default DrawingPreview;
