import { FloorPlanObject } from '../types/editor';

export function isResizable(type: FloorPlanObject['type']) {
  return type === 'room' || type === 'label';
}

export function getDefaultSize(type: FloorPlanObject['type']) {
  switch (type) {
    case 'room':
      return { width: 240, height: 140 };
    case 'door':
      return { width: 18, height: 50 };
    case 'exit':
      return { width: 80, height: 32 };
    case 'stairs':
      return { width: 80, height: 60 };
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
