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
}

export const SensorShape: React.FC<SensorShapeProps> = React.memo(({
  object,
  selected,
  isDark,
  isDanger,
  isWarning,
  reading,
  commonProps,
}) => {
  let badgeColor = isDark ? '#1e293b' : '#f1f5f9';
  let strokeColor = isDark ? '#334155' : '#cbd5e1';

  if (isDanger) {
    badgeColor = '#ef4444';
    strokeColor = '#fca5a5';
  } else if (isWarning) {
    badgeColor = '#f59e0b';
    strokeColor = '#fde68a';
  } else if (selected) {
    strokeColor = '#3b82f6';
  }

  const isMq2 = object.type === 'mq2' || object.id.toLowerCase().includes('mq2');
  const isTemp = object.type === 'temp' || object.id.toLowerCase().includes('temp');
  const icon = isMq2 ? '💨' : isTemp ? '🌡️' : '📡';
  const label = `${object.name || (isMq2 ? 'MQ2' : isTemp ? 'Temp' : 'Cảm biến')}`;
  const valueStr = reading ? `${reading.val} ${reading.unit}` : '--';

  return (
    <Group {...commonProps}>
      <Circle
        name={isDanger ? 'danger-blink-sensor' : isWarning ? 'warning-blink-sensor' : undefined}
        radius={22}
        x={22}
        y={22}
        fill={badgeColor}
        stroke={strokeColor}
        strokeWidth={selected || isDanger || isWarning ? 2.5 : 1.5}
        shadowColor={isDanger ? '#ef4444' : isWarning ? '#f59e0b' : ''}
        shadowBlur={isDanger || isWarning ? 10 : 0}
      />
      <Text text={icon} x={13} y={13} fontSize={16} />
      <Text
        text={label}
        x={-15}
        y={48}
        width={74}
        align="center"
        fontSize={10}
        fontStyle="bold"
        fill={isDark ? '#cbd5e1' : '#475569'}
      />
      <Group x={-10} y={64}>
        <Rect
          width={64}
          height={16}
          fill={isDark ? '#0f172a' : '#ffffff'}
          stroke={isDanger ? '#ef4444' : isWarning ? '#f59e0b' : isDark ? '#334155' : '#cbd5e1'}
          strokeWidth={1}
          cornerRadius={4}
        />
        <Text
          text={valueStr}
          width={64}
          align="center"
          y={3}
          fontSize={9}
          fontStyle="bold"
          fill={isDanger ? '#ef4444' : isWarning ? '#f59e0b' : isDark ? '#38bdf8' : '#3b82f6'}
        />
      </Group>
    </Group>
  );
});

SensorShape.displayName = 'SensorShape';
export default SensorShape;
