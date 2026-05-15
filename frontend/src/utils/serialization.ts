import { FloorPlanObject } from '../types/editor';

export function exportPlanToJson(objects: FloorPlanObject[]) {
  return JSON.stringify(objects, null, 2);
}

export function importPlanFromJson(raw: string): FloorPlanObject[] {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid JSON format');
  }
  return parsed;
}
