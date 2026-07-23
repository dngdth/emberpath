import React from 'react';
import { Group, Circle, Text } from 'react-konva';
import { FloorPlanObject } from '../../../types/editor';

interface SensorShapeProps {
  object: FloorPlanObject;
  selected: boolean;
  isDark: boolean;
  isDanger: boolean;
  isWarning: boolean;
  reading?: { val: number; unit: string };
  commonProps: any;
  isHovered?: boolean;
}

export const SensorShape: React.FC<SensorShapeProps> = React.memo(({
  object,
  selected,
  isDark,
  isDanger,
  isWarning,
  commonProps,
  isHovered,
}) => {
  const isMq2  = object.type === 'mq2'  || object.id.toLowerCase().includes('mq2');
  const isTemp = object.type === 'temp' || object.id.toLowerCase().includes('temp');
  const icon   = isMq2 ? '💨' : isTemp ? '🌡️' : '📡';
  const label  = object.name || (isMq2 ? 'MQ2' : isTemp ? 'Temp' : 'Cảm biến');

  // Màu sắc theo trạng thái
  let badgeColor  = isDark ? '#1e1b4b' : '#eef2ff';
  let strokeColor = isDark ? '#6366f1' : '#818cf8';

  if (isDanger) {
    badgeColor  = 'rgba(127,29,29,0.90)';
    strokeColor = '#ef4444';
  } else if (isWarning) {
    badgeColor  = 'rgba(120,53,15,0.90)';
    strokeColor = '#f59e0b';
  } else if (selected) {
    strokeColor = '#f472b6';
  }

  const scale = isHovered ? 1.12 : 1;

  return (
    <Group {...commonProps}>
      <Group
        x={24}
        y={24}
        offsetX={24}
        offsetY={24}
        scaleX={scale}
        scaleY={scale}
        shadowColor={isDanger ? '#ef4444' : isWarning ? '#f59e0b' : 'transparent'}
        shadowBlur={isDanger ? 16 : isWarning ? 12 : 0}
        shadowOpacity={isDanger || isWarning ? 0.7 : 0}
      >
        {/* Outer pulse ring — chỉ khi danger */}
        {isDanger && (
          <Circle
            name="danger-blink-sensor"
            radius={30}
            x={24}
            y={24}
            fill="transparent"
            stroke="#ef4444"
            strokeWidth={2.5}
            opacity={0.65}
          />
        )}

        {/* Main circle */}
        <Circle
          radius={24}
          x={24}
          y={24}
          fill={badgeColor}
          stroke={strokeColor}
          strokeWidth={isDanger || isWarning ? 3 : 2}
          shadowColor={strokeColor}
          shadowBlur={isDanger || isWarning ? 14 : 6}
          shadowOpacity={isDark ? 0.6 : 0.3}
        />

        {/* Icon */}
        <Text text={icon} x={13} y={12} fontSize={20} listening={false} />

        {/* Tên node bên dưới */}
        <Text
          text={label}
          x={-32}
          y={52}
          width={112}
          align="center"
          fontSize={11}
          fontStyle="bold"
          fill={object.textColor || (isDark ? '#cbd5e1' : '#1e293b')}
          shadowColor={isDark ? '#000' : '#fff'}
          shadowBlur={2}
          listening={false}
        />
      </Group>
    </Group>
  );
});

SensorShape.displayName = 'SensorShape';
export default SensorShape;
