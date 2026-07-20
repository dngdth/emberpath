import React from 'react';
import { Group, Rect, Line, Text } from 'react-konva';
import { FloorPlanObject } from '../../../types/editor';

interface ElevatorShapeProps {
  object: FloorPlanObject;
  selected: boolean;
  isDark: boolean;
  commonProps: any;
}

export const ElevatorShape: React.FC<ElevatorShapeProps> = React.memo(({
  object,
  selected,
  isDark,
  commonProps,
}) => {
  const width = object.width || 80;
  const height = object.height || 80;
  const fill = object.color || '#e9f179';

  return (
    <Group {...commonProps}>
      <Rect
        width={width}
        height={height}
        fill={fill}
        stroke={selected ? '#3b82f6' : '#cbd5e1'}
        strokeWidth={1.5}
        cornerRadius={8}
      />
      <Line
        points={[width / 2, 4, width / 2, height - 4]}
        stroke={isDark ? '#475569' : '#94a3b8'}
        strokeWidth={1.5}
      />
      <Text
        text={object.name || 'Thang máy'}
        width={width}
        align="center"
        y={height / 2 - 6}
        fontSize={11}
        fontStyle="bold"
        fill={object.textColor || (isDark ? '#003870' : '#003870')}
      />
      {object.target_floor_id && (
        <Text
          text={`-> Floor ${object.target_floor_id}`}
          width={width}
          align="center"
          y={height - 16}
          fontSize={8}
          fontStyle="bold"
          fill={isDark ? '#38bdf8' : '#2563eb'}
        />
      )}
    </Group>
  );
});

ElevatorShape.displayName = 'ElevatorShape';
export default ElevatorShape;
