import React from 'react';
import Konva from 'konva';
import { Group, Rect, Line, Text } from 'react-konva';
import { FloorPlanObject } from '../../../types/editor';

interface FloorBaseShapeProps {
  object: FloorPlanObject;
  selected: boolean;
  isDark: boolean;
  commonProps: any;
}

export const FloorBaseShape: React.FC<FloorBaseShapeProps> = React.memo(({
  object,
  selected,
  isDark,
  commonProps,
}) => {
  const width = object.width || 400;
  const height = object.height || 400;
  const isPolygon = object.shapeType === 'polygon';
  const pts = isPolygon ? object.points || [] : [0, 0, width, 0, width, height, 0, height];
  const fill = object.color || (isDark ? '#1e293b' : '#dde7f8');

  return (
    <Group {...commonProps}>
      <Group
        clipFunc={(ctx) => {
          if (pts.length < 4) return;
          ctx.beginPath();
          ctx.moveTo(pts[0], pts[1]);
          for (let i = 2; i < pts.length; i += 2) {
            ctx.lineTo(pts[i], pts[i + 1]);
          }
          ctx.closePath();
        }}
      >
        <Rect
          x={0}
          y={0}
          width={isPolygon ? 4000 : width}
          height={isPolygon ? 4000 : height}
          fill={fill}
        />
      </Group>
      <Line
        id={isPolygon ? `${object.id}-polygon` : undefined}
        points={pts}
        closed={true}
        stroke={selected ? '#3b82f6' : isDark ? '#475569' : '#cbd5e1'}
        strokeWidth={selected ? 2.5 : 1.5}
        shadowColor="rgba(0, 0, 0, 0.1)"
        shadowBlur={selected ? 8 : 2}
      />
      <Text
        text={object.name || 'Floor Base'}
        x={pts[0] + 16}
        y={pts[1] + 16}
        fontSize={12}
        fontStyle="bold"
        fill={isDark ? '#475569' : '#94a3b8'}
      />
    </Group>
  );
});

FloorBaseShape.displayName = 'FloorBaseShape';
export default FloorBaseShape;
