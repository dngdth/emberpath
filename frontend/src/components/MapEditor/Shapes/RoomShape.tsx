import React from 'react';
import { Group, Rect, Line, Text } from 'react-konva';
import { FloorPlanObject } from '../../../types/editor';

interface RoomShapeProps {
  object: FloorPlanObject;
  selected: boolean;
  isDark: boolean;
  isRoomDanger: boolean;
  commonProps: any;
}

export const RoomShape: React.FC<RoomShapeProps> = React.memo(({
  object,
  selected,
  isDark,
  isRoomDanger,
  commonProps,
}) => {
  const width = object.width || 240;
  const height = object.height || 140;
  const roomStroke = isRoomDanger ? '#ef4444' : selected ? '#3b82f6' : '#cbd5e1';
  const fill = isRoomDanger
    ? 'rgba(239, 68, 68, 0.45)'
    : isDark
    ? 'rgba(16, 185, 129, 0.12)'
    : object.color || 'rgba(234, 217, 207, 0.4)';

  return (
    <Group {...commonProps}>
      {object.shapeType === 'polygon' ? (
        <Line
          id={`${object.id}-polygon`}
          name={isRoomDanger ? 'danger-blink' : undefined}
          points={object.points || []}
          closed={true}
          fill={fill}
          stroke={roomStroke}
          strokeWidth={selected || isRoomDanger ? 3 : 1.5}
          shadowColor={isRoomDanger ? '#ef4444' : selected ? '#3b82f6' : 'rgba(0, 0, 0, 0.04)'}
          shadowBlur={selected || isRoomDanger ? 12 : 0}
          shadowOpacity={0.6}
        />
      ) : (
        <Rect
          name={isRoomDanger ? 'danger-blink' : undefined}
          width={width}
          height={height}
          fill={fill}
          stroke={roomStroke}
          cornerRadius={16}
          strokeWidth={selected || isRoomDanger ? 3 : 1.5}
          shadowColor={isRoomDanger ? '#ef4444' : selected ? '#3b82f6' : 'rgba(0, 0, 0, 0.04)'}
          shadowBlur={selected || isRoomDanger ? 12 : 0}
          shadowOpacity={0.6}
        />
      )}
      <Text
        text={object.name || 'Room'}
        x={object.shapeType === 'polygon' ? (object.points?.[0] || 0) + 16 : 16}
        y={object.shapeType === 'polygon' ? (object.points?.[1] || 0) + 16 : 14}
        fontSize={15}
        fontStyle="bold"
        fill={isRoomDanger ? '#ef4444' : object.textColor || (isDark ? '#f8fafc' : '#334155')}
      />
      {isRoomDanger && (
        <Group
          x={object.shapeType === 'polygon' ? (object.points?.[0] || 0) + 16 : 16}
          y={object.shapeType === 'polygon' ? (object.points?.[1] || 0) + 38 : 38}
        >
          <Rect width={84} height={20} fill="#ef4444" cornerRadius={6} />
          <Text text="⚠️ DANGER" x={8} y={5} fontSize={10} fontStyle="bold" fill="#ffffff" />
        </Group>
      )}
    </Group>
  );
});

RoomShape.displayName = 'RoomShape';
export default RoomShape;
