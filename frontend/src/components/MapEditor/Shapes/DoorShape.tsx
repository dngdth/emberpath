import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { FloorPlanObject } from '../../../types/editor';

interface DoorShapeProps {
  object: FloorPlanObject;
  selected: boolean;
  isDark: boolean;
  commonProps: any;
}

export const DoorShape: React.FC<DoorShapeProps> = React.memo(({
  object,
  selected,
  isDark,
  commonProps,
}) => {
  const width = object.width || 60;
  const height = object.height || 60;
  const fill = object.color || '#d9a36b';

  return (
    <Group {...commonProps}>
      <Rect
        width={width}
        height={height}
        fill={fill}
        cornerRadius={4}
        stroke={selected ? '#3b82f6' : 'transparent'}
        strokeWidth={1.5}
      />
      <Text
        text={object.name || ''}
        x={-10}
        y={height + 6}
        fontSize={11}
        fill={isDark ? '#94a3b8' : '#475569'}
      />
    </Group>
  );
});

DoorShape.displayName = 'DoorShape';
export default DoorShape;
