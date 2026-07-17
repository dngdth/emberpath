import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { FloorPlanObject } from '../../../types/editor';

interface ExitShapeProps {
  object: FloorPlanObject;
  selected: boolean;
  commonProps: any;
}

export const ExitShape: React.FC<ExitShapeProps> = React.memo(({
  object,
  selected,
  commonProps,
}) => {
  const width = object.width || 80;
  const height = object.height || 40;
  const fill = '#2ea85f';

  return (
    <Group {...commonProps}>
      <Rect
        width={width}
        height={height}
        fill={fill}
        cornerRadius={8}
        stroke={selected ? '#3b82f6' : '#10b981'}
        strokeWidth={1.5}
      />
      <Text
        text={object.name || 'EXIT'}
        width={width}
        align="center"
        y={height / 2 - 6}
        fontStyle="bold"
        fontSize={12}
        fill="#ffffff"
      />
    </Group>
  );
});

ExitShape.displayName = 'ExitShape';
export default ExitShape;
