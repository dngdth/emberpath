import { FloorPlanObject } from '../types/editor';

export function isResizable(type: FloorPlanObject['type']) {
  return type !== 'connector';
}

export function getDefaultSize(type: FloorPlanObject['type']) {
  switch (type) {
    case 'floor_base':
      return { width: 800, height: 600 };
    case 'room':
      return { width: 240, height: 140 };
    case 'door':
      return { width: 18, height: 50 };
    case 'exit':
      return { width: 80, height: 32 };
    case 'stairs':
      return { width: 80, height: 60 };
    case 'elevator':
      return { width: 60, height: 60 };
    case 'wall':
      return { width: 160, height: 16 };
    case 'mq2':
    case 'temp':
      return { width: 36, height: 36 };
    case 'led':
      return { width: 16, height: 16 };
    case 'label':
      return { width: 180, height: 40 };
    default:
      return { width: 40, height: 40 };
  }
}

export function getCanvasPoints(shape: 'rect' | 'l-shape' | 'polygon', w: number, h: number): number[] {
  if (shape === 'l-shape') {
    return [
      0, 0,
      w, 0,
      w, h * 0.5,
      w * 0.5, h * 0.5,
      w * 0.5, h,
      0, h,
    ];
  }
  if (shape === 'polygon') {
    return [
      w * 0.25, 0,
      w * 0.75, 0,
      w, h * 0.5,
      w * 0.75, h,
      w * 0.25, h,
      0, h * 0.5,
    ];
  }
  // rect / default
  return [
    0, 0,
    w, 0,
    w, h,
    0, h,
  ];
}

interface Point {
  x: number;
  y: number;
}

export function isPointInPolygon(px: number, py: number, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > py) !== (yj > py))
        && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function ccw(A: Point, B: Point, C: Point): boolean {
  return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
}

export function intersectSegments(A: Point, B: Point, C: Point, D: Point): boolean {
  return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
}

export function getRotatedCorners(wall: FloorPlanObject): Point[] {
  const x = wall.x;
  const y = wall.y;
  const w = wall.width || getDefaultSize('wall').width;
  const h = wall.height || getDefaultSize('wall').height;
  const rotation = wall.rotation || 0;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const localPts = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];

  return localPts.map((pt) => ({
    x: x + (pt.x * cos - pt.y * sin),
    y: y + (pt.x * sin + pt.y * cos),
  }));
}

export function connectorIntersectsWall(
  fromNode: FloorPlanObject,
  toNode: FloorPlanObject,
  wall: FloorPlanObject
): boolean {
  const fromSize = getDefaultSize(fromNode.type);
  const toSize = getDefaultSize(toNode.type);
  const A = {
    x: fromNode.x + (fromNode.width || fromSize.width) / 2,
    y: fromNode.y + (fromNode.height || fromSize.height) / 2,
  };
  const B = {
    x: toNode.x + (toNode.width || toSize.width) / 2,
    y: toNode.y + (toNode.height || toSize.height) / 2,
  };

  const corners = getRotatedCorners(wall);

  // Check intersection with all 4 edges of the wall
  for (let i = 0; i < 4; i++) {
    const C = corners[i];
    const D = corners[(i + 1) % 4];
    if (intersectSegments(A, B, C, D)) {
      return true;
    }
  }
  return false;
}
