import React from 'react';
import { Line } from 'react-konva';

interface GuidesOverlayProps {
  editMode: boolean;
  guides: Array<{ orientation: 'vertical' | 'horizontal'; value: number }>;
  canvasWidth: number;
  canvasHeight: number;
}

export const GuidesOverlay: React.FC<GuidesOverlayProps> = React.memo(({
  editMode,
  guides,
  canvasWidth,
  canvasHeight,
}) => {
  if (!editMode) return null;

  return (
    <>
      {guides.map((guide, index) =>
        guide.orientation === 'vertical' ? (
          <Line
            key={`guide-${index}`}
            points={[guide.value, 0, guide.value, canvasHeight]}
            stroke="#c2410c"
            dash={[4, 6]}
          />
        ) : (
          <Line
            key={`guide-${index}`}
            points={[0, guide.value, canvasWidth, guide.value]}
            stroke="#c2410c"
            dash={[4, 6]}
          />
        ),
      )}
    </>
  );
});

GuidesOverlay.displayName = 'GuidesOverlay';
export default GuidesOverlay;
