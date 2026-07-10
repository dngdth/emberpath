import { useState } from 'react';
import { FloorPlanObject } from '../types/editor';
import { createNewObject } from '../data/initialMockData';
import { snapPosition } from '../utils/snapHelpers';

export function useEditorState(objects: FloorPlanObject[], setObjects: (next: FloorPlanObject[]) => void) {
  const [activeTool, setActiveTool] = useState<'select' | 'pan' | FloorPlanObject['type']>('select');
  const [clipboard, setClipboard] = useState<FloorPlanObject[]>([]);
  const [snapEnabled, setSnapEnabled] = useState(true);


  function addObject(type: FloorPlanObject['type'], x: number, y: number) {
    const snapped = snapPosition(x, y, snapEnabled);
    setObjects([...objects, createNewObject(type, snapped.x, snapped.y)]);
    // setActiveTool('select');
  }

  function updateObject(id: string, patch: Partial<FloorPlanObject>) {
    setObjects(objects.map((object) => (object.id === id ? { ...object, ...patch } : object)));
  }

  function removeObjects(ids: string[]) {
    setObjects(objects.filter((object) => !ids.includes(object.id)));
  }

  function duplicateObjects(ids: string[]) {
    const copies = objects
      .filter((object) => ids.includes(object.id))
      .map((object) => ({ ...object, id: `${object.type}-${crypto.randomUUID()}`, x: object.x + 24, y: object.y + 24 }));
    setObjects([...objects, ...copies]);
    return copies.map((item) => item.id);
  }

  function copyObjects(ids: string[]) {
    setClipboard(objects.filter((object) => ids.includes(object.id)));
  }

  function pasteObjects() {
    if (!clipboard.length) return [] as string[];
    const copies = clipboard.map((object) => ({ ...object, id: `${object.type}-${crypto.randomUUID()}`, x: object.x + 30, y: object.y + 30 }));
    setObjects([...objects, ...copies]);
    return copies.map((item) => item.id);
  }

  function bringToFront(id: string) {
    const target = objects.find((item) => item.id === id);
    if (!target) return;
    setObjects([...objects.filter((item) => item.id !== id), target]);
  }

  function sendToBack(id: string) {
    const target = objects.find((item) => item.id === id);
    if (!target) return;
    setObjects([target, ...objects.filter((item) => item.id !== id)]);
  }

  function createConnector(fromNodeId: string, toNodeId: string) {
    const connector: FloorPlanObject = {
      id: `connector-${crypto.randomUUID()}`,
      type: 'connector',
      x: 0,
      y: 0,
      fromNodeId,
      toNodeId,
      locked: true,
    };
    setObjects([...objects, connector]);
  }

  return {
    activeTool,
    setActiveTool,
    snapEnabled,
    setSnapEnabled,
    createConnector,
    addObject,
    updateObject,
    removeObjects,
    duplicateObjects,
    copyObjects,
    pasteObjects,
    bringToFront,
    sendToBack,
  };
}
