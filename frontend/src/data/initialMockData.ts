import { FloorPlanObject, ObjectType } from '../types/editor';
import { getDefaultSize } from '../utils/geometryHelpers';

export const tokenLibrary: Array<{ type: ObjectType; label: string; description: string }> = [
  { type: 'room', label: 'Room', description: 'Resizable room block' },
  { type: 'door', label: 'Door', description: 'Door token' },
  { type: 'exit', label: 'Exit', description: 'Emergency exit label' },
  { type: 'stairs', label: 'Stairs', description: 'Stairway token' },
  { type: 'mq2', label: 'MQ2 sensor', description: 'Gas/smoke sensor' },
  { type: 'temp', label: 'Temp sensor', description: 'Temperature sensor' },
  { type: 'led', label: 'LED node', description: 'LED safe/danger node' },
  { type: 'label', label: 'Text label', description: 'Free text label' },
];

export function createNewObject(type: ObjectType, x = 120, y = 120): FloorPlanObject {
  const size = getDefaultSize(type);
  const baseName = {
    room: 'New Room',
    door: 'Door',
    exit: 'EXIT',
    stairs: 'Stairs',
    mq2: 'MQ2',
    temp: 'Temp',
    led: 'LED',
    label: 'Label',
    connector: 'Connector',
  }[type];

  return {
    id: `${type}-${crypto.randomUUID()}`,
    type,
    name: baseName,
    x,
    y,
    width: size.width,
    height: size.height,
    rotation: 0,
    color: type === 'room' ? '#1f2937' : type === 'exit' ? '#22c55e' : type === 'label' ? '#f8fafc' : '#38bdf8',
    textColor: '#f8fafc',
    fontSize: type === 'label' ? 22 : 14,
    nodeStatus: type === 'led' ? 'safe' : undefined,
    locked: false,
    visible: true,
  };
}
