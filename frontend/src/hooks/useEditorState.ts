import { useState } from 'react';
import { FloorPlanObject } from '../types/editor';
import { createNewObject } from '../data/initialMockData';
import { snapPosition } from '../utils/snapHelpers';
import { getDefaultSize } from '../utils/geometryHelpers';

export function useEditorState(objects: FloorPlanObject[], setObjects: (next: FloorPlanObject[]) => void) {
  const [activeTool, setActiveTool] = useState<string>('select');
  const [clipboard, setClipboard] = useState<FloorPlanObject[]>([]);
  const [snapEnabled, setSnapEnabled] = useState(true);


  function addObject(type: any, x: number, y: number) {
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

  function cutObjects(ids: string[]) {
    copyObjects(ids);
    removeObjects(ids);
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
    const fromNode = objects.find((object) => object.id === fromNodeId);
    const toNode = objects.find((object) => object.id === toNodeId);
    if (!fromNode || !toNode) return;

    const fromSize = getDefaultSize(fromNode.type);
    const toSize = getDefaultSize(toNode.type);
    const fromX = fromNode.x + (fromNode.width || fromSize.width) / 2;
    const fromY = fromNode.y + (fromNode.height || fromSize.height) / 2;
    const toX = toNode.x + (toNode.width || toSize.width) / 2;
    const toY = toNode.y + (toNode.height || toSize.height) / 2;
    const originX = Math.min(fromX, toX);
    const originY = Math.min(fromY, toY);

    const connector: FloorPlanObject = {
      id: `led_wire-${crypto.randomUUID()}`,
      type: 'led_wire',
      name: 'Dây LED',
      x: originX,
      y: originY,
      fromNodeId,
      toNodeId,
      points: [fromX - originX, fromY - originY, toX - originX, toY - originY],
      shapeType: 'polygon',
      color: '#64748b',
      locked: false,
      visible: true,
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
    cutObjects,
    pasteObjects,
    bringToFront,
    sendToBack,
  };
}
