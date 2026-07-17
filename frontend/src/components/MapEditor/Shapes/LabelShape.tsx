import React from 'react';
import { Group, Text } from 'react-konva';
import { FloorPlanObject } from '../../../types/editor';

interface LabelShapeProps {
  object: FloorPlanObject;
  isDark: boolean;
  commonProps: any;
}

export const LabelShape: React.FC<LabelShapeProps> = React.memo(({
  object,
  isDark,
  commonProps,
}) => {
  const fill = object.textColor || object.color
    ? ((object.textColor === '#f8fafc' || object.color === '#f8fafc') && !isDark)
      ? '#1e293b'
      : (object.textColor || object.color)
    : (isDark ? '#f8fafc' : '#1e293b');

  return (
    <Group {...commonProps}>
      <Text
        text={object.name || 'Label'}
        fontSize={object.fontSize || 20}
        fill={fill}
        fontStyle="bold"
      />
    </Group>
  );
});

LabelShape.displayName = 'LabelShape';
export default LabelShape;
