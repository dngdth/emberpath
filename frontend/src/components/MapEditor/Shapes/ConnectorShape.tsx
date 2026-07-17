import React from 'react';
import { Group, Line, Circle, Text } from 'react-konva';
import { FloorPlanObject } from '../../../types/editor';
import { getDefaultSize, connectorIntersectsWall } from '../../../utils/geometryHelpers';

interface ConnectorShapeProps {
  object: FloorPlanObject;
  selected: boolean;
  isDark: boolean;
  fromNode?: FloorPlanObject;
  toNode?: FloorPlanObject;
  wallObjects: FloorPlanObject[];
  commonProps: any;
}

export const ConnectorShape: React.FC<ConnectorShapeProps> = React.memo(({
  object,
  selected,
  isDark,
  fromNode,
  toNode,
  wallObjects,
  commonProps,
}) => {
  if (!fromNode || !toNode) return null;

  const fromSize = getDefaultSize(fromNode.type);
  const toSize = getDefaultSize(toNode.type);

  const fromX = fromNode.x + (fromNode.width || fromSize.width) / 2;
  const fromY = fromNode.y + (fromNode.height || fromSize.height) / 2;
  const toX = toNode.x + (toNode.width || toSize.width) / 2;
  const toY = toNode.y + (toNode.height || toSize.height) / 2;

  // Realtime wall collision check
  const intersectsWall = wallObjects.some((wall) =>
    connectorIntersectsWall(fromNode, toNode, wall)
  );

  return (
    <Group {...commonProps} x={0} y={0}>
      <Line
        points={[fromX, fromY, toX, toY]}
        stroke={
          intersectsWall
            ? '#f43f5e'
            : selected
            ? '#3b82f6'
            : isDark
            ? '#475569'
            : '#9ca3af'
        }
        strokeWidth={selected ? 4 : intersectsWall ? 3.5 : 2}
        dash={intersectsWall ? [5, 5] : [5, 8]}
        opacity={intersectsWall ? 0.95 : 0.7}
        hitStrokeWidth={15}
      />
      {intersectsWall && (
        <Group x={(fromX + toX) / 2 - 8} y={(fromY + toY) / 2 - 8}>
          <Circle radius={10} fill="#f43f5e" />
          <Text text="⚠️" x={-6} y={-6} fontSize={10} fill="#ffffff" fontStyle="bold" />
        </Group>
      )}
    </Group>
  );
});

ConnectorShape.displayName = 'ConnectorShape';
export default ConnectorShape;
