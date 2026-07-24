import React from 'react';
import { Layer, Group, Rect } from 'react-konva';

interface CanvasBackgroundProps {
  position: { x: number; y: number };
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  isDark: boolean;
  snapEnabled: boolean;
  gridPattern: HTMLCanvasElement | null;
}

export const CanvasBackground: React.FC<CanvasBackgroundProps> = React.memo(({
  position,
  canvasWidth,
  canvasHeight,
  scale,
  isDark,
  snapEnabled,
  gridPattern,
}) => {
  return (
    <Layer>
      <Group x={position.x} y={position.y}>
        <Rect
          name="workspace-empty"
          x={0}
          y={0}
          width={canvasWidth * scale}
          height={canvasHeight * scale}
          fill={isDark ? '#0f172a' : '#f8fafc'}
          stroke={isDark ? '#1e293b' : '#cbd5e1'}
          strokeWidth={1.5}
          cornerRadius={8}
          shadowColor="rgba(0, 0, 0, 0.08)"
          shadowBlur={16}
        />
        {snapEnabled && gridPattern && (
          <Rect
            x={0}
            y={0}
            width={canvasWidth * scale}
            height={canvasHeight * scale}
            fillPatternImage={gridPattern as any}
            fillPatternScaleX={scale}
            fillPatternScaleY={scale}
            fillPatternRepeat="repeat"
            opacity={1.0}
            listening={false}
          />
        )}
      </Group>
    </Layer>
  );
});

CanvasBackground.displayName = 'CanvasBackground';
export default CanvasBackground;
