import React from 'react';
import { Group, Rect } from 'react-konva';
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
  const width = object.width || 120;
  const height = object.height || 16;
  const fill = '#64748b';

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
