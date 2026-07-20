import React from 'react';
import { Group, Circle } from 'react-konva';
import { FloorPlanObject } from '../../../types/editor';

interface LedShapeProps {
  object: FloorPlanObject;
  selected: boolean;
  commonProps: any;
}

export const LedShape: React.FC<LedShapeProps> = React.memo(({
  object,
  selected,
  commonProps,
}) => {
  const width = object.width || 16;
  const fill = object.nodeStatus === 'danger' ? '#ef4444' : '#10b981';

  return (
    <Group {...commonProps}>
      <Circle
        radius={width / 2}
        fill={fill}
        stroke={selected ? '#3b82f6' : '#ffffff'}
        strokeWidth={1.5}
        shadowColor={fill}
        shadowBlur={selected ? 8 : 4}
      />
    </Group>
  );
});

LedShape.displayName = 'LedShape';
export default LedShape;
