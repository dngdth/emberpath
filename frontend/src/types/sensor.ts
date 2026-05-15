export interface SensorDevice {
  id: number;
  building_id: number;
  floor_id: number | null;
  room_name: string | null;
  device_id: string;
  name: string;
  sensor_type: 'mq2' | 'temp';
  threshold: number;
  latest_value: number;
  latest_status: 'safe' | 'danger';
  unit: string;
  last_seen_at: string | null;
}

export interface DashboardSummary {
  total_mq2: number;
  total_temperature: number;
  safe_count: number;
  danger_count: number;
  latest_updated_at: string | null;
}
