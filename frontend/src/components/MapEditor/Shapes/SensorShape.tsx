import React from 'react';
import { Group, Circle, Rect, Text } from 'react-konva';
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
  reading,
  commonProps,
  isHovered,
}) => {
  let badgeColor = isDark ? '#1e1b4b' : '#eef2ff';
  let strokeColor = isDark ? '#6366f1' : '#818cf8';

  if (isDanger) {
    badgeColor = '#ef4444';
    strokeColor = '#fca5a5';
  } else if (isWarning) {
    badgeColor = '#f59e0b';
    strokeColor = '#fde68a';
  } else if (selected) {
    strokeColor = '#f472b6';
  }

  const isMq2 = object.type === 'mq2' || object.id.toLowerCase().includes('mq2');
  const isTemp = object.type === 'temp' || object.id.toLowerCase().includes('temp');
  const icon = isMq2 ? '💨' : isTemp ? '🌡️' : '📡';
  const label = `${object.name || (isMq2 ? 'MQ2' : isTemp ? 'Temp' : 'Cảm biến')}`;
  const valueStr = reading ? `${reading.val} ${reading.unit}` : '--';

  const scale = isHovered ? 1.15 : 1;

  return (
    <Group {...commonProps}>
      <Group
        x={22}
        y={22}
        offsetX={22}
        offsetY={22}
        scaleX={scale}
        scaleY={scale}
        shadowColor={isDanger ? '#ef4444' : isWarning ? '#f59e0b' : isDark ? '#38bdf8' : '#3b82f6'}
        shadowBlur={isHovered ? 15 : 0}
        shadowOffset={isHovered ? { x: 0, y: 5 } : { x: 0, y: 0 }}
        shadowOpacity={isHovered ? 0.45 : 0}
      >
        <Circle
          name={isDanger ? 'danger-blink-sensor' : isWarning ? 'warning-blink-sensor' : undefined}
          radius={24}
          x={22}
          y={22}
          fill={badgeColor}
          stroke={strokeColor}
          strokeWidth={selected || isDanger || isWarning ? 3 : 2}
          shadowColor={isDanger ? '#ef4444' : isWarning ? '#f59e0b' : selected ? '#f472b6' : strokeColor}
          shadowBlur={isDanger || isWarning ? 15 : 6}
          shadowOpacity={isDark ? 0.6 : 0.3}
        />
        <Text text={icon} x={11} y={11} fontSize={20} />
        <Text
          text={label}
          x={-28}
          y={52}
          width={100}
          align="center"
          fontSize={12}
          fontStyle="bold"
          fill={object.textColor || (isDark ? '#f8fafc' : '#1e293b')}
          shadowColor={isDark ? '#000' : '#fff'}
          shadowBlur={2}
        />

      </Group>
    </Group>
  );
});

SensorShape.displayName = 'SensorShape';
export default SensorShape;
