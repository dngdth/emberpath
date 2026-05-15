import { FloorPlanObject } from '../types/editor';

export const GRID_SIZE = 24;

export function snapValue(value: number, enabled: boolean) {
  if (!enabled) return value;
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function snapPosition(x: number, y: number, enabled: boolean) {
  return {
    x: snapValue(x, enabled),
    y: snapValue(y, enabled),
  };
}

export function getGuideLines(target: FloorPlanObject, objects: FloorPlanObject[]) {
  const threshold = 8;
  const guides: Array<{ orientation: 'vertical' | 'horizontal'; value: number }> = [];
  for (const object of objects) {
    if (object.id === target.id) continue;
    if (Math.abs(object.x - target.x) < threshold) {
      guides.push({ orientation: 'vertical', value: object.x });
    }
    if (Math.abs(object.y - target.y) < threshold) {
      guides.push({ orientation: 'horizontal', value: object.y });
    }
  }
  return guides;
}
