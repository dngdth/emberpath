from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SensorDeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    building_id: int
    floor_id: int | None
    room_name: str | None
    device_id: str
    name: str
    sensor_type: str
    threshold: float
    latest_value: float
    latest_status: str
    unit: str
    last_seen_at: datetime | None


class SensorReadingResponse(BaseModel):
    id: int
    device_id: str
    name: str
    sensor_type: str
    value: float
    status: str
    unit: str
    created_at: datetime
    floor_id: int | None
    room_name: str | None


class DashboardSummaryResponse(BaseModel):
    total_mq2: int
    total_temperature: int
    safe_count: int
    danger_count: int
    latest_updated_at: datetime | None


class DeviceIngestRequest(BaseModel):
    buildingCode: str
    deviceId: str
    sensorType: str
    value: float
    unit: str
    timestamp: datetime | None = None
