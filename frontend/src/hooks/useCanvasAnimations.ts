import React, { useEffect } from 'react';
import Konva from 'konva';

interface UseCanvasAnimationsProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  activeWireDirectionsCount: number;
  dangerDeviceIdsCount: number;
  warningDeviceIdsCount: number;
}

export function useCanvasAnimations({
  stageRef,
  activeWireDirectionsCount,
  dangerDeviceIdsCount,
  warningDeviceIdsCount,
}: UseCanvasAnimationsProps) {
  const hasSafePathAnimation = activeWireDirectionsCount > 0;
  const hasStatusAnimation = dangerDeviceIdsCount > 0 || warningDeviceIdsCount > 0;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || (!hasSafePathAnimation && !hasStatusAnimation)) return;

    let dashOffset = 0;
    let previousBlinkPhase: boolean | null = null;

    const anim = new Konva.Animation((frame) => {
      if (!frame) return;
      const time = frame.time;

      // 1. Animate evacuation path line dashOffset & LED wires
      const timeDiff = frame.timeDiff;
      dashOffset = (dashOffset - timeDiff * 0.05) % 40;
      const activeLedWires = stage.find('.active-led-wire');
      activeLedWires.forEach((node) => {
        (node as any).dashOffset(dashOffset);
      });

      // 2. Animate blinking warning sensors (500ms intervals)
      const isAlt = Math.floor(time / 500) % 2 === 0;
      if (!hasStatusAnimation || isAlt === previousBlinkPhase) return;
      previousBlinkPhase = isAlt;

      const dangerSensors = stage.find('.danger-blink-sensor');
      dangerSensors.forEach((node) => {
        node.opacity(isAlt ? 1.0 : 0.4);
      });

      const warningSensors = stage.find('.warning-blink-sensor');
      warningSensors.forEach((node) => {
        node.opacity(isAlt ? 1.0 : 0.6);
      });
    });

    anim.start();
    return () => {
      anim.stop();
    };
  }, [hasSafePathAnimation, hasStatusAnimation, stageRef]);
}
