import asyncio
import random
from datetime import datetime

from sqlalchemy import select

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.sensor import SensorDevice, SensorReading
from app.services.websocket_manager import ws_manager
from app.utils.status import evaluate_sensor_status


async def simulator_loop() -> None:
    while True:
        await asyncio.sleep(settings.simulator_interval_seconds)
        db = SessionLocal()
        try:
            devices = db.scalars(select(SensorDevice)).all()
            touched_buildings: set[int] = set()
            for device in devices:
                if device.sensor_type == "mq2":
                    base = 180 if device.latest_status == "safe" else 260
                    value = max(50, random.gauss(base, 60))
                    if random.random() < 0.15:
                        value = device.threshold + random.uniform(20, 90)
                else:
                    base = 29 if device.latest_status == "safe" else 42
                    value = max(18, random.gauss(base, 5))
                    if random.random() < 0.12:
                        value = device.threshold + random.uniform(2, 12)

                status = evaluate_sensor_status(device.sensor_type, value, device.threshold)
                now = datetime.utcnow()
                device.latest_value = round(value, 2)
                device.latest_status = status
                device.last_seen_at = now
                db.add(SensorReading(device_id=device.id, value=device.latest_value, status=status, unit=device.unit, created_at=now))
                touched_buildings.add(device.building_id)

            db.commit()

            for building_id in touched_buildings:
                await ws_manager.broadcast_to_building(
                    building_id,
                    {"type": "sensor_tick", "building_id": building_id, "timestamp": datetime.utcnow().isoformat()},
                )
        finally:
            db.close()
