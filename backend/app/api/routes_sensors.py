from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.building import Building
from app.models.sensor import SensorDevice, SensorReading
from app.models.user import User
from app.schemas.sensor import DeviceIngestRequest, SensorDeviceResponse, SensorReadingResponse
from app.services.websocket_manager import ws_manager
from app.utils.status import evaluate_sensor_status

router = APIRouter(prefix="/sensors", tags=["sensors"])
ingest_router = APIRouter(tags=["ingest"])


def get_filtered_devices(db: Session, current_user: User, sensor_type: str, floor_id: int | None, search: str | None):
    query = select(SensorDevice).where(SensorDevice.building_id == current_user.building_id, SensorDevice.sensor_type == sensor_type)
    if floor_id:
        query = query.where(SensorDevice.floor_id == floor_id)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(SensorDevice.name.ilike(search_term) | SensorDevice.device_id.ilike(search_term) | SensorDevice.room_name.ilike(search_term))
    query = query.order_by(desc(SensorDevice.latest_status), SensorDevice.name.asc())
    return db.scalars(query).all()


@router.get("/mq2", response_model=list[SensorDeviceResponse])
def list_mq2(
    floor_id: int | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_filtered_devices(db, current_user, "mq2", floor_id, search)


@router.get("/temperature", response_model=list[SensorDeviceResponse])
def list_temp(
    floor_id: int | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_filtered_devices(db, current_user, "temp", floor_id, search)


@router.get("/readings/live", response_model=list[SensorReadingResponse])
def live_readings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    devices = db.scalars(
        select(SensorDevice)
        .where(SensorDevice.building_id == current_user.building_id)
        .order_by(SensorDevice.sensor_type.asc(), SensorDevice.name.asc())
    ).all()
    results = []
    for device in devices:
        results.append(
            SensorReadingResponse(
                id=device.id,
                device_id=device.device_id,
                name=device.name,
                sensor_type=device.sensor_type,
                value=device.latest_value,
                status=device.latest_status,
                unit=device.unit,
                created_at=device.last_seen_at or datetime.utcnow(),
                floor_id=device.floor_id,
                room_name=device.room_name,
            )
        )
    return results


@router.get("/readings/history", response_model=list[SensorReadingResponse])
def get_sensor_history(
    floor_id: int | None = Query(default=None),
    sensor_type: str | None = Query(default=None),
    status: str | None = Query(default=None),
    device_id: str | None = Query(default=None),
    room_name: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=2000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(SensorReading)
        .join(SensorDevice)
        .where(SensorDevice.building_id == current_user.building_id)
    )
    if floor_id and type(floor_id).__name__ != 'Query':
        query = query.where(SensorDevice.floor_id == floor_id)
    if sensor_type and type(sensor_type).__name__ != 'Query':
        query = query.where(SensorDevice.sensor_type == sensor_type)
    if status and type(status).__name__ != 'Query':
        query = query.where(SensorReading.status == status)
    if device_id and type(device_id).__name__ != 'Query':
        query = query.where(SensorDevice.device_id == device_id)
    if room_name and type(room_name).__name__ != 'Query':
        query = query.where(SensorDevice.room_name == room_name)

    limit_val = limit if isinstance(limit, int) else 100
    offset_val = offset if isinstance(offset, int) else 0

    query = query.order_by(desc(SensorReading.created_at)).offset(offset_val).limit(limit_val)
    readings = db.scalars(query).all()

    return [
        SensorReadingResponse(
            id=r.id,
            device_id=r.device.device_id,
            name=r.device.name,
            sensor_type=r.device.sensor_type,
            value=r.value,
            status=r.status,
            unit=r.unit,
            created_at=r.created_at,
            floor_id=r.device.floor_id,
            room_name=r.device.room_name,
        )
        for r in readings
    ]


@ingest_router.post("/device-readings/ingest")
async def ingest_device_reading(payload: DeviceIngestRequest, db: Session = Depends(get_db)):
    building = db.scalar(select(Building).where(Building.code == payload.buildingCode.strip().upper()))
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    device = db.scalar(select(SensorDevice).where(SensorDevice.device_id == payload.deviceId, SensorDevice.building_id == building.id))
    if not device:
        raise HTTPException(status_code=404, detail="Sensor device not found")

    timestamp = payload.timestamp or datetime.utcnow()
    status = evaluate_sensor_status(payload.sensorType, payload.value, device.threshold)

    prev_val = device.latest_value
    prev_status = device.latest_status

    # Always update live state for realtime monitoring & WebSocket push
    device.latest_value = payload.value
    device.latest_status = status
    device.last_seen_at = timestamp

    # Log to history table only when value changed significantly, status changed, or heartbeat (10 mins)
    is_significant = False
    if prev_val is None or prev_status != status:
        is_significant = True
    else:
        delta = abs(payload.value - prev_val)
        if payload.sensorType == 'temp' and delta >= 1.0:
            is_significant = True
        elif payload.sensorType == 'mq2' and delta >= 30.0:
            is_significant = True
        elif device.last_seen_at and (timestamp - device.last_seen_at).total_seconds() >= 600:
            is_significant = True

    if is_significant:
        db.add(SensorReading(device_id=device.id, value=payload.value, status=status, unit=payload.unit, created_at=timestamp))

    db.commit()

    await ws_manager.broadcast_to_building(building.id, {"type": "sensor_tick", "building_id": building.id, "timestamp": timestamp.isoformat()})
    return {"message": "Reading ingested", "status": status, "logged_to_history": is_significant}
