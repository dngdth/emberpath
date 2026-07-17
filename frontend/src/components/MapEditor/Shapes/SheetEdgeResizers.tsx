import React from 'react';
import { Group, Line, Circle } from 'react-konva';

interface SheetEdgeResizersProps {
  canvasWidth: number;
  canvasHeight: number;
  activeEdge: 'left' | 'right' | 'top' | 'bottom' | null;
  setHoveredEdge: (edge: 'left' | 'right' | 'top' | 'bottom' | null) => void;
  dragResizeBounds: { x: number; y: number; w: number; h: number } | null;
  setDragResizeBounds: (bounds: { x: number; y: number; w: number; h: number } | null) => void;
  onCommitCanvasResize?: (width: number, height: number, shiftX: number, shiftY: number) => void;
}

export const SheetEdgeResizers: React.FC<SheetEdgeResizersProps> = React.memo(({
  canvasWidth,
  canvasHeight,
  activeEdge,
  setHoveredEdge,
  dragResizeBounds,
  setDragResizeBounds,
  onCommitCanvasResize,
}) => {
  return (
    <Group>
      {/* Left Edge Resizer */}
      <Line
        points={[0, 0, 0, canvasHeight]}
        stroke={activeEdge === 'left' ? '#3b82f6' : 'transparent'}
        strokeWidth={6}
        hitStrokeWidth={16}
        draggable
        onDragStart={() => setHoveredEdge('left')}
        onDragMove={(e) => {
          const node = e.target;
          const rawDx = node.x();
          const newW = Math.max(400, Math.min(10000, canvasWidth - rawDx));
          const constrainedDx = canvasWidth - newW;
          setDragResizeBounds({ x: constrainedDx, y: 0, w: newW, h: canvasHeight });
          node.y(0);
        }}
        onDragEnd={(e) => {
          const finalW = dragResizeBounds?.w ?? canvasWidth;
          const shiftX = canvasWidth - finalW;
          onCommitCanvasResize?.(finalW, canvasHeight, shiftX, 0);
          setDragResizeBounds(null);
          setHoveredEdge(null);
          const node = e.target;
          node.x(0);
          node.y(0);
        }}
        onMouseEnter={(e) => {
          setHoveredEdge('left');
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'ew-resize';
        }}
        onMouseLeave={(e) => {
          setHoveredEdge(null);
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'default';
        }}
      />

      {/* Right Edge Resizer */}
      <Line
        points={[canvasWidth, 0, canvasWidth, canvasHeight]}
        stroke={activeEdge === 'right' ? '#3b82f6' : 'transparent'}
        strokeWidth={6}
        hitStrokeWidth={16}
        draggable
        onDragStart={() => setHoveredEdge('right')}
        onDragMove={(e) => {
          const node = e.target;
          const rawDx = node.x();
          const newW = Math.max(400, Math.min(10000, canvasWidth + rawDx));
          setDragResizeBounds({ x: 0, y: 0, w: newW, h: canvasHeight });
          node.y(0);
        }}
        onDragEnd={(e) => {
          const finalW = dragResizeBounds?.w ?? canvasWidth;
          onCommitCanvasResize?.(finalW, canvasHeight, 0, 0);
          setDragResizeBounds(null);
          setHoveredEdge(null);
          const node = e.target;
          node.x(0);
          node.y(0);
        }}
        onMouseEnter={(e) => {
          setHoveredEdge('right');
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'ew-resize';
        }}
        onMouseLeave={(e) => {
          setHoveredEdge(null);
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'default';
        }}
      />

      {/* Top Edge Resizer */}
      <Line
        points={[0, 0, canvasWidth, 0]}
        stroke={activeEdge === 'top' ? '#3b82f6' : 'transparent'}
        strokeWidth={6}
        hitStrokeWidth={16}
        draggable
        onDragStart={() => setHoveredEdge('top')}
        onDragMove={(e) => {
          const node = e.target;
          const rawDy = node.y();
          const newH = Math.max(400, Math.min(10000, canvasHeight - rawDy));
          const constrainedDy = canvasHeight - newH;
          setDragResizeBounds({ x: 0, y: constrainedDy, w: canvasWidth, h: newH });
          node.x(0);
        }}
        onDragEnd={(e) => {
          const finalH = dragResizeBounds?.h ?? canvasHeight;
          const shiftY = canvasHeight - finalH;
          onCommitCanvasResize?.(canvasWidth, finalH, 0, shiftY);
          setDragResizeBounds(null);
          setHoveredEdge(null);
          const node = e.target;
          node.x(0);
          node.y(0);
        }}
        onMouseEnter={(e) => {
          setHoveredEdge('top');
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'ns-resize';
        }}
        onMouseLeave={(e) => {
          setHoveredEdge(null);
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'default';
        }}
      />

      {/* Bottom Edge Resizer */}
      <Line
        points={[0, canvasHeight, canvasWidth, canvasHeight]}
        stroke={activeEdge === 'bottom' ? '#3b82f6' : 'transparent'}
        strokeWidth={6}
        hitStrokeWidth={16}
        draggable
        onDragStart={() => setHoveredEdge('bottom')}
        onDragMove={(e) => {
          const node = e.target;
          const rawDy = node.y();
          const newH = Math.max(400, Math.min(10000, canvasHeight + rawDy));
          setDragResizeBounds({ x: 0, y: 0, w: canvasWidth, h: newH });
          node.x(0);
        }}
        onDragEnd={(e) => {
          const finalH = dragResizeBounds?.h ?? canvasHeight;
          onCommitCanvasResize?.(canvasWidth, finalH, 0, 0);
          setDragResizeBounds(null);
          setHoveredEdge(null);
          const node = e.target;
          node.x(0);
          node.y(0);
        }}
        onMouseEnter={(e) => {
          setHoveredEdge('bottom');
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'ns-resize';
        }}
        onMouseLeave={(e) => {
          setHoveredEdge(null);
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'default';
        }}
      />

      {/* Corner Resize Handle */}
      <Group
        x={canvasWidth}
        y={canvasHeight}
        draggable
        onDragStart={() => setHoveredEdge('right')}
        onDragMove={(e) => {
          const node = e.target;
          const rawDx = node.x() - canvasWidth;
          const rawDy = node.y() - canvasHeight;
          const newW = Math.max(400, Math.min(10000, canvasWidth + rawDx));
          const newH = Math.max(400, Math.min(10000, canvasHeight + rawDy));
          setDragResizeBounds({ x: 0, y: 0, w: newW, h: newH });
        }}
        onDragEnd={(e) => {
          const finalW = dragResizeBounds?.w ?? canvasWidth;
          const finalH = dragResizeBounds?.h ?? canvasHeight;
          onCommitCanvasResize?.(finalW, finalH, 0, 0);
          setDragResizeBounds(null);
          setHoveredEdge(null);
          const node = e.target;
          node.x(canvasWidth);
          node.y(canvasHeight);
        }}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'nwse-resize';
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'default';
        }}
      >
        <Circle
          radius={10}
          fill="#3b82f6"
          stroke="#ffffff"
          strokeWidth={2}
          shadowColor="rgba(0, 0, 0, 0.25)"
          shadowBlur={6}
        />
        <Line
          points={[-3, 0, 0, -3, 3, 0]}
          stroke="#ffffff"
          strokeWidth={1.5}
        />
      </Group>
    </Group>
  );
});

SheetEdgeResizers.displayName = 'SheetEdgeResizers';
export default SheetEdgeResizers;
