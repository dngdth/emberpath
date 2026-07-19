import React from 'react';
import { Group, Rect, Line } from 'react-konva';
import { FloorPlanObject } from '../../../types/editor';

interface WallShapeProps {
  object: FloorPlanObject;
  selected: boolean;
  isDark: boolean;
  commonProps: any;
}

export const WallShape: React.FC<WallShapeProps> = React.memo(({
  object,
  selected,
  isDark,
  commonProps,
}) => {
  const points = object.points || [];
  const fill = object.color || '#64748b';

  // Polyline wall drawing
  if (object.shapeType === 'polygon' && points.length > 0) {
    const strokeColor = selected
      ? '#3b82f6'
      : object.color || (isDark ? '#64748b' : '#94a3b8');

    return (
      <Group {...commonProps}>
        {/* Highlight glow layer on selection */}
        {selected && (
          <Line
            points={points}
            stroke="#3b82f6"
            strokeWidth={10}
            lineJoin="round"
            lineCap="round"
            opacity={0.35}
            listening={false}
          />
        )}
        {/* Outer border/casing line for visual definition */}
        <Line
          points={points}
          stroke={isDark ? '#0f172a' : '#cbd5e1'}
          strokeWidth={8}
          lineJoin="round"
          lineCap="round"
          listening={false}
        />
        {/* Main core wall line */}
        <Line
          points={points}
          stroke={strokeColor}
          strokeWidth={5}
          lineJoin="round"
          lineCap="round"
        />
      </Group>
    );
  }

  // Fallback for old rectangular walls
  const width = object.width || 120;
  const height = object.height || 16;

  return (
    <Group {...commonProps}>
      <Rect
        width={width}
        height={height}
        fill={fill}
        stroke={selected ? '#3b82f6' : isDark ? '#1e293b' : '#cbd5e1'}
        strokeWidth={selected ? 2 : 1}
        cornerRadius={2}
        shadowColor="black"
        shadowBlur={selected ? 6 : 2}
        shadowOpacity={0.25}
      />
    </Group>
  );
});

WallShape.displayName = 'WallShape';
export default WallShape;
