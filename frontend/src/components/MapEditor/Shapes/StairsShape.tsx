import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { FloorPlanObject } from '../../../types/editor';
import { StairsSymbol } from '../StairsSymbol';

interface StairsShapeProps {
  object: FloorPlanObject;
  selected: boolean;
  isDark: boolean;
  commonProps: any;
}

export const StairsShape: React.FC<StairsShapeProps> = React.memo(({
  object,
  selected,
  isDark,
  commonProps,
}) => {
  const width = object.width || 80;
  const height = object.height || 80;
  const stairStrokeColor = selected ? '#3b82f6' : '#475569';
  const fill = object.color || '#cbd5e1';

  return (
    <Group {...commonProps}>
      <Rect
        width={width}
        height={height}
        fill={fill}
        stroke={stairStrokeColor}
        strokeWidth={1.5}
        cornerRadius={8}
      />
      <StairsSymbol width={width} height={height} strokeColor={stairStrokeColor} strokeWidth={1.5} isDashed={false} />
      {object.target_floor_id && (
        <Group x={width / 2 - 25} y={height - 16}>
          <Rect
            width={50}
            height={12}
            fill={isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)'}
            cornerRadius={3}
            stroke={isDark ? '#38bdf8' : '#2563eb'}
            strokeWidth={0.5}
          />
          <Text
            text={`F ${object.target_floor_id}`}
            width={50}
            align="center"
            y={2.5}
            fontSize={7}
            fontStyle="bold"
            fill={isDark ? '#38bdf8' : '#2563eb'}
          />
        </Group>
      )}
    </Group>
  );
});

StairsShape.displayName = 'StairsShape';
export default StairsShape;
