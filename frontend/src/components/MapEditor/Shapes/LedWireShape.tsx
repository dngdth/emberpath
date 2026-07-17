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
    ? '#f472b6'
    : isDark
    ? '#8b5cf6'
    : '#a78bfa';

  return (
    <Group {...commonProps}>
      {/* 1. Glow Aura Layer */}
      <Line
        points={points}
        stroke={baseStroke}
        strokeWidth={active ? 10 : selected ? 6 : 5}
        lineJoin="round"
        lineCap="round"
        opacity={active ? 0.4 : isDark ? 0.8 : 0.6}
        shadowColor={active ? '#10b981' : selected ? '#f472b6' : baseStroke}
        shadowBlur={active ? 15 : 6}
        shadowOpacity={active ? 0.9 : isDark ? 0.6 : 0.4}
      />
      {/* 2. Dashed Running Core Layer */}
      <Line
        name={active ? 'active-led-wire' : undefined}
        points={points}
        stroke={active ? '#34d399' : selected ? '#fbcfe8' : isDark ? '#c4b5fd' : '#7c3aed'}
        strokeWidth={active ? 4 : 2.5}
        lineJoin="round"
        lineCap="round"
        dash={active ? [12, 10] : [8, 6]}
        opacity={active ? 1.0 : 0.9}
      />
    </Group>
  );
});

LedWireShape.displayName = 'LedWireShape';
export default LedWireShape;
