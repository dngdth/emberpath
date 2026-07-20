import React from 'react';
import { Group, Rect, Line, Text } from 'react-konva';
import { FloorPlanObject } from '../../../types/editor';
import { StairsSymbol } from '../StairsSymbol';
import { getDefaultSize } from '../../../utils/geometryHelpers';

interface BelowObjectOutlineProps {
  object: FloorPlanObject;
  isDark: boolean;
}

export const BelowObjectOutline: React.FC<BelowObjectOutlineProps> = React.memo(({
  object,
  isDark,
}) => {
  const width = object.width || getDefaultSize(object.type).width;
  const height = object.height || getDefaultSize(object.type).height;

  const strokeColor = isDark
    ? 'rgba(165, 180, 252, 0.85)'
    : 'rgba(79, 70, 229, 0.35)';

  const strokeWidth = 1.2;
  const dash = [5, 4];

  const commonBelowProps = {
    x: object.x,
    y: object.y,
    rotation: object.rotation || 0,
    listening: false,
  };

  if (object.type === 'floor_base') {
    const isPolygon = object.shapeType === 'polygon';
    const pts = isPolygon ? object.points || [] : [0, 0, width, 0, width, height, 0, height];
    return (
      <Group {...commonBelowProps}>
        <Line
          points={pts}
          closed={true}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={dash}
          fill={isDark ? 'rgba(30, 41, 59, 0.35)' : 'rgba(203, 213, 225, 0.1)'}
        />
      </Group>
    );
  }

  if (object.type === 'room') {
    const isPolygon = object.shapeType === 'polygon';
    return (
      <Group {...commonBelowProps}>
        {isPolygon ? (
          <Line
            points={object.points || []}
            closed={true}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            dash={dash}
            fill={isDark ? 'rgba(99, 102, 241, 0.07)' : 'rgba(234, 217, 207, 0.08)'}
          />
        ) : (
          <Rect
            width={width}
            height={height}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            dash={dash}
            cornerRadius={16}
            fill={isDark ? 'rgba(99, 102, 241, 0.07)' : 'rgba(234, 217, 207, 0.08)'}
          />
        )}
        <Text
          text={object.name || ''}
          x={isPolygon ? (object.points?.[0] || 0) + 12 : 12}
          y={isPolygon ? (object.points?.[1] || 0) + 12 : 12}
          fontSize={11}
          fontStyle="bold"
          fill={strokeColor}
          opacity={0.8}
        />
      </Group>
    );
  }

  if (object.type === 'door') {
    const doorColor = isDark ? 'rgba(217, 163, 107, 0.45)' : 'rgba(217, 163, 107, 0.25)';
    return (
      <Group {...commonBelowProps}>
        <Rect
          width={width}
          height={height}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={dash}
          cornerRadius={4}
          fill={doorColor}
        />
        <Line
          points={[0, 0, width, height]}
          stroke={strokeColor}
          strokeWidth={0.8}
          dash={[3, 3]}
        />
        <Text
          text="Cửa"
          x={width + 4}
          y={height / 2 - 5}
          fontSize={9}
          fill={strokeColor}
          opacity={0.8}
          fontStyle="bold"
        />
      </Group>
    );
  }

  if (object.type === 'exit') {
    const exitBgColor = isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(46, 168, 95, 0.25)';
    const exitBorderColor = isDark ? 'rgba(52, 211, 153, 0.85)' : 'rgba(34, 197, 94, 0.4)';
    return (
      <Group {...commonBelowProps}>
        <Rect
          width={width}
          height={height}
          stroke={exitBorderColor}
          strokeWidth={strokeWidth}
          dash={dash}
          cornerRadius={8}
          fill={exitBgColor}
        />
        <Text
          text="EXIT"
          width={width}
          align="center"
          y={height / 2 - 5}
          fontStyle="bold"
          fontSize={9}
          fill={exitBorderColor}
          opacity={0.9}
        />
      </Group>
    );
  }

  if (object.type === 'stairs') {
    return (
      <Group {...commonBelowProps}>
        <Rect
          width={width}
          height={height}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={dash}
          cornerRadius={8}
          fill={isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(203, 213, 225, 0.2)'}
        />
        <StairsSymbol
          width={width}
          height={height}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          isDashed={true}
        />
      </Group>
    );
  }

  if (object.type === 'elevator') {
    return (
      <Group {...commonBelowProps}>
        <Rect
          width={width}
          height={height}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={dash}
          cornerRadius={8}
          fill={isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(226, 232, 240, 0.2)'}
        />
        <Line
          points={[width / 2, 4, width / 2, height - 4]}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={dash}
        />
      </Group>
    );
  }

  if (object.type === 'wall') {
    const isPolygon = object.shapeType === 'polygon';
    const pts = isPolygon ? object.points || [] : [0, 0, width, 0, width, height, 0, height];
    return (
      <Group {...commonBelowProps}>
        <Line
          points={pts}
          closed={!isPolygon}
          stroke={strokeColor}
          strokeWidth={isPolygon ? 3.5 : strokeWidth}
          dash={dash}
        />
      </Group>
    );
  }

  if (object.type === 'label') {
    return (
      <Group {...commonBelowProps}>
        <Text
          text={object.name || ''}
          fontSize={object.fontSize || 18}
          fill={strokeColor}
          opacity={0.8}
          fontStyle="bold"
        />
      </Group>
    );
  }

  return null;
});

BelowObjectOutline.displayName = 'BelowObjectOutline';
export default BelowObjectOutline;
