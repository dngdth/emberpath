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
  const isMq2  = object.type === 'mq2'  || object.id.toLowerCase().includes('mq2');
  const isTemp = object.type === 'temp' || object.id.toLowerCase().includes('temp');
  const icon   = isMq2 ? '💨' : isTemp ? '🌡️' : '📡';
  const label  = object.name || (isMq2 ? 'MQ2' : isTemp ? 'Temp' : 'Cảm biến');

  // Dynamic badge colours
  let badgeColor  = isDark ? '#1e1b4b' : '#eef2ff';
  let strokeColor = isDark ? '#6366f1' : '#818cf8';
  let valueColor  = isDark ? '#38bdf8' : '#2563eb';

  if (isDanger) {
    badgeColor  = 'rgba(127,29,29,0.85)';
    strokeColor = '#ef4444';
    valueColor  = '#fca5a5';
  } else if (isWarning) {
    badgeColor  = 'rgba(120,53,15,0.85)';
    strokeColor = '#f59e0b';
    valueColor  = '#fde68a';
  } else if (selected) {
    strokeColor = '#f472b6';
  }

  // Live value display
  const hasReading = reading !== undefined;
  const valueStr   = hasReading ? `${Number(reading!.val).toFixed(1)} ${reading!.unit}` : '--';

  const scale = isHovered ? 1.15 : 1;

  return (
    <Group {...commonProps}>
      <Group
        x={24}
        y={24}
        offsetX={24}
        offsetY={24}
        scaleX={scale}
        scaleY={scale}
        shadowColor={isDanger ? '#ef4444' : isWarning ? '#f59e0b' : isDark ? '#38bdf8' : '#3b82f6'}
        shadowBlur={isHovered ? 20 : isDanger ? 10 : 0}
        shadowOffset={isHovered ? { x: 0, y: 4 } : { x: 0, y: 0 }}
        shadowOpacity={isHovered ? 0.5 : isDanger ? 0.5 : 0}
      >
        {/* Outer pulse ring — rendered via Konva animation (danger-blink-sensor class) */}
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

        {/* Main circle badge */}
        <Circle
          radius={24}
          x={24}
          y={24}
          fill={badgeColor}
          stroke={strokeColor}
          strokeWidth={isDanger || isWarning ? 3 : 2}
          shadowColor={isDanger ? '#ef4444' : isWarning ? '#f59e0b' : selected ? '#f472b6' : strokeColor}
          shadowBlur={isDanger || isWarning ? 14 : 6}
          shadowOpacity={isDark ? 0.6 : 0.3}
        />

        {/* Icon emoji */}
        <Text text={icon} x={13} y={12} fontSize={20} listening={false} />

        {/* Live value pill — always shown */}
        <Rect
          x={-4}
          y={42}
          width={56}
          height={17}
          fill={isDanger ? '#7f1d1d' : isWarning ? '#78350f' : isDark ? '#0f172a' : '#f1f5f9'}
          stroke={strokeColor}
          strokeWidth={1}
          cornerRadius={8}
          opacity={0.92}
        />
        <Text
          text={valueStr}
          x={-2}
          y={45}
          width={52}
          align="center"
          fontSize={10}
          fontStyle="bold"
          fill={valueColor}
          listening={false}
        />

        {/* Node name label below pill */}
        <Text
          text={label}
          x={-32}
          y={64}
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
