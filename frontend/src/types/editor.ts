export type ObjectType = 'room' | 'door' | 'exit' | 'stairs' | 'mq2' | 'temp' | 'led' | 'label' | 'connector';

export interface FloorPlanObject {
  id: string;
  type: ObjectType;
  name?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  color?: string;
  textColor?: string;
  fontSize?: number;
  nodeStatus?: 'safe' | 'danger';
  locked?: boolean;
  visible?: boolean;
  fromNodeId?: string;
  toNodeId?: string;
}

export interface FloorItem {
  id: number;
  building_id: number;
  name: string;
  order_index: number;
}

export interface FloorPlanResponse {
  floor_id: number;
  floor_name: string;
  objects: FloorPlanObject[];
  version: number;
}
