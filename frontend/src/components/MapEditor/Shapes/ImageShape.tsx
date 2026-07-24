import React, { useEffect, useState } from 'react';
import { Group, Image as KonvaImage, Rect, Text } from 'react-konva';
import { FloorPlanObject } from '../../../types/editor';

interface ImageShapeProps {
  object: FloorPlanObject;
  selected: boolean;
  isDark: boolean;
  commonProps: any;
}

export const ImageShape: React.FC<ImageShapeProps> = React.memo(({
  object,
  selected,
  isDark,
  commonProps,
}) => {
  const width = object.width || 400;
  const height = object.height || 300;
  const opacity = object.opacity ?? 0.5; // Default opacity 0.5 for tracing
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!object.src) {
      setImageElement(null);
      return;
    }
    setHasError(false);
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageElement(img);
    };
    img.onerror = () => {
      setHasError(true);
    };
    img.src = object.src;
  }, [object.src]);

  return (
    <Group {...commonProps}>
      {imageElement && !hasError ? (
        <KonvaImage
          image={imageElement}
          width={width}
          height={height}
          opacity={opacity}
        />
      ) : (
        <Group>
          <Rect
            width={width}
            height={height}
            fill={isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(241, 245, 249, 0.6)'}
            stroke={selected ? '#3b82f6' : isDark ? '#475569' : '#cbd5e1'}
            strokeWidth={selected ? 2 : 1}
            dash={[6, 4]}
            opacity={opacity}
          />
          <Text
            text={hasError ? '⚠️ Không thể tải ảnh' : '🖼️ Hình ảnh sơ đồ'}
            x={12}
            y={12}
            fontSize={12}
            fontStyle="bold"
            fill={isDark ? '#94a3b8' : '#64748b'}
          />
        </Group>
      )}

      {/* Visual outline indicator when selected */}
      {selected && (
        <Rect
          width={width}
          height={height}
          stroke="#3b82f6"
          strokeWidth={2}
          dash={[4, 2]}
        />
      )}
    </Group>
  );
});

ImageShape.displayName = 'ImageShape';
export default ImageShape;
