import React from 'react';
import { Arrow, Group, Line } from 'react-konva';
import { FloorPlanObject } from '../../../types/editor';
import { getDefaultSize } from '../../../utils/geometryHelpers';

interface LedWireShapeProps {
  object: FloorPlanObject;
  selected: boolean;
  isDark: boolean;
  active: boolean; // Active when evacuation/guidance path is active
  reverse?: boolean;
  status?: 'safe' | 'danger';
  fromNode?: FloorPlanObject;
  toNode?: FloorPlanObject;
  commonProps: any;
}

function centerRelativeToWire(node: FloorPlanObject, wire: FloorPlanObject) {
  const size = getDefaultSize(node.type);
  return [
    node.x + (node.width ?? size.width) / 2 - wire.x,
    node.y + (node.height ?? size.height) / 2 - wire.y,
  ];
}

export const LedWireShape: React.FC<LedWireShapeProps> = React.memo(({
  object,
  selected,
  isDark,
  active,
  reverse = false,
  status = 'safe',
  fromNode,
  toNode,
  commonProps,
}) => {
  const points = [...(object.points || [])];
  if (points.length >= 4 && fromNode) {
    const [x, y] = centerRelativeToWire(fromNode, object);
    points[0] = x;
    points[1] = y;
  }
  if (points.length >= 4 && toNode) {
    const [x, y] = centerRelativeToWire(toNode, object);
    points[points.length - 2] = x;
    points[points.length - 1] = y;
  }
  const directedPoints = reverse
    ? Array.from({ length: points.length / 2 }, (_, index) => {
        const sourceIndex = points.length - 2 - index * 2;
        return [points[sourceIndex], points[sourceIndex + 1]];
      }).flat()
    : points;

  const activeStroke = status === 'danger' ? '#ef4444' : '#10b981';
  const activeCore = status === 'danger' ? '#f87171' : '#34d399';
  const baseStroke = active
    ? activeStroke
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
        shadowColor={active ? activeStroke : selected ? '#f472b6' : baseStroke}
        shadowBlur={active ? 15 : 6}
        shadowOpacity={active ? 0.9 : isDark ? 0.6 : 0.4}
      />
      {/* 2. Dashed Running Core Layer */}
      <Arrow
        name={active ? 'active-led-wire' : undefined}
        points={directedPoints}
        stroke={active ? activeCore : selected ? '#fbcfe8' : isDark ? '#c4b5fd' : '#7c3aed'}
        fill={active ? activeCore : selected ? '#fbcfe8' : isDark ? '#c4b5fd' : '#7c3aed'}
        strokeWidth={active ? 4 : 2.5}
        lineJoin="round"
        lineCap="round"
        dash={active ? [12, 10] : [8, 6]}
        opacity={active ? 1.0 : 0.9}
        pointerLength={active ? 14 : 0}
        pointerWidth={active ? 14 : 0}
      />
    </Group>
  );
});

LedWireShape.displayName = 'LedWireShape';
export default LedWireShape;
