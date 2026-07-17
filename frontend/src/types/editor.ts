export type ObjectType = 'floor_base' | 'room' | 'door' | 'exit' | 'stairs' | 'elevator' | 'wall' | 'mq2' | 'temp' | 'led' | 'label' | 'connector';

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
  shapeType?: 'rect' | 'polygon';
  target_floor_id?: number;
  points?: number[];
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
  canvas_width?: number;
  canvas_height?: number;
  canvas_shape?: 'rect' | 'l-shape' | 'polygon';
}
