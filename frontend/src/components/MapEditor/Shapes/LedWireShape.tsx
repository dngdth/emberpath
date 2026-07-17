import React from 'react';
import { Group, Line } from 'react-konva';
import { FloorPlanObject } from '../../../types/editor';

interface LedWireShapeProps {
  object: FloorPlanObject;
  selected: boolean;
  isDark: boolean;
  active: boolean; // Active when evacuation/guidance path is active
  commonProps: any;
}

export const LedWireShape: React.FC<LedWireShapeProps> = React.memo(({
  object,
  selected,
  isDark,
  active,
  commonProps,
}) => {
  const points = object.points || [];

  const baseStroke = active
    ? '#10b981'
    : selected
    ? '#3b82f6'
    : isDark
    ? '#334155'
    : '#cbd5e1';

  return (
    <Group {...commonProps}>
      {/* 1. Glow Aura Layer */}
      <Line
        points={points}
        stroke={baseStroke}
        strokeWidth={active ? 8 : selected ? 4 : 3}
        lineJoin="round"
        lineCap="round"
        opacity={active ? 0.35 : 0.6}
        shadowColor="#10b981"
        shadowBlur={active ? 12 : 0}
        shadowOpacity={active ? 0.8 : 0}
      />
      {/* 2. Dashed Running Core Layer */}
      <Line
        name={active ? 'active-led-wire' : undefined}
        points={points}
        stroke={active ? '#34d399' : isDark ? '#475569' : '#94a3b8'}
        strokeWidth={active ? 3.5 : 1.5}
        lineJoin="round"
        lineCap="round"
        dash={active ? [12, 10] : [5, 5]}
        opacity={active ? 1.0 : 0.8}
      />
    </Group>
  );
});

LedWireShape.displayName = 'LedWireShape';
export default LedWireShape;
