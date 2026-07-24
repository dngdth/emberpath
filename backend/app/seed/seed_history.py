import sys
import os
import random
from datetime import datetime, timedelta

# Add backend folder to python path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.building import Building
from app.models.floor import Floor
from app.models.plan import PlanObject
from app.models.sensor import SensorDevice, SensorReading
from app.utils.status import evaluate_sensor_status

def seed_history(db: Session | None = None):
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True
    try:
        now = datetime.utcnow()
        
        # 1. Check if Gradient Demo Tower exists and seed devices for its drawn plan objects
        gradient_building = db.query(Building).filter(Building.code == "GRADIENT-DEMO").first()
        if gradient_building:
            print("Found Gradient Demo Tower. Seeding devices from its plan objects...")
            plan_objects = db.query(PlanObject).filter(
                PlanObject.building_id == gradient_building.id,
                PlanObject.type.in_(["sensor", "mq2", "temp"])
            ).all()
            
            devices_added = 0
            for p in plan_objects:
                clean_name = p.name or p.object_id
                
                # temp device
                temp_id = f"temp-{p.object_id}"
                if not db.query(SensorDevice).filter(SensorDevice.device_id == temp_id).first():
                    db.add(SensorDevice(
                        building_id=gradient_building.id,
                        floor_id=p.floor_id,
                        room_name=clean_name,
                        device_id=temp_id,
                        name=clean_name,
                        sensor_type="temp",
                        threshold=50.0,
                        latest_value=25.0,
                        latest_status="safe",
                        unit="C",
                        last_seen_at=now
                    ))
                    devices_added += 1
                
                # mq2 device
                mq2_id = f"mq2-{p.object_id}"
                if not db.query(SensorDevice).filter(SensorDevice.device_id == mq2_id).first():
                    db.add(SensorDevice(
                        building_id=gradient_building.id,
                        floor_id=p.floor_id,
                        room_name=clean_name,
                        device_id=mq2_id,
                        name=clean_name,
                        sensor_type="mq2",
                        threshold=600.0,
                        latest_value=180.0,
                        latest_status="safe",
                        unit="ppm",
                        last_seen_at=now
                    ))
                    devices_added += 1
            
            db.commit()
            print(f"Added {devices_added} new SensorDevice records for Gradient Demo Tower!")

        # 2. Get all devices in database to seed history
        devices = db.query(SensorDevice).all()
        if not devices:
            print("No sensor devices found. Please seed the database first.")
            return

        # Clear existing readings to make it clean
        print("Clearing existing sensor readings...")
        db.query(SensorReading).delete()
        db.commit()

        # Seed readings for the last 24 hours (sampling every 30 seconds, logging on significant change or 10m heartbeat)
        print(f"Seeding history for {len(devices)} devices with 30s sampling & deadband logging...")
        readings_count = 0

        # 2,880 steps of 30 seconds = 24 hours
        total_steps = 2880
        step_seconds = 30
        start_time = now - timedelta(seconds=total_steps * step_seconds)

        for device in devices:
            last_logged_val: float | None = None
            last_logged_status: str | None = None
            last_logged_time: datetime | None = None

            for step in range(total_steps + 1):
                timestamp = start_time + timedelta(seconds=step * step_seconds)
                # i represents fractional 15-min interval index (0 to 96) for spike curve calculation
                i = (step * step_seconds) / 900.0

                base_val = 25.0 if device.sensor_type == 'temp' else 180.0
                val = base_val

                if device.sensor_type == 'temp':
                    noise = random.uniform(-0.4, 0.4)
                    val = base_val + noise
                    # Temperature spike 1: around t=3h ago (i between 10 and 14)
                    if 10 <= i <= 14 and ("master" in device.device_id or "sat-1" in device.device_id or "f1-entry" in device.device_id or "f1-danger" in device.device_id):
                        val += 26.0 * (1.0 - abs(i - 12) / 2.0)
                    # Temperature spike 2: around t=12h ago (i between 45 and 50)
                    if 45 <= i <= 50 and ("sat-2" in device.device_id or "f2-upper" in device.device_id):
                        val += 27.0 * (1.0 - abs(i - 48) / 2.5)

                elif device.sensor_type == 'mq2':
                    noise = random.uniform(-8.0, 8.0)
                    val = base_val + noise
                    # Smoke spike 1: around t=3h ago
                    if 10 <= i <= 14 and ("master" in device.device_id or "sat-1" in device.device_id or "f1-entry" in device.device_id or "f1-danger" in device.device_id):
                        val += 460.0 * (1.0 - abs(i - 12) / 2.0)
                    # Smoke spike 2: around t=12h ago
                    if 45 <= i <= 50 and ("sat-2" in device.device_id or "f2-upper" in device.device_id):
                        val += 480.0 * (1.0 - abs(i - 48) / 2.5)

                val = round(val, 1) if device.sensor_type == 'temp' else int(val)
                status = evaluate_sensor_status(device.sensor_type, val, device.threshold)

                # Check Deadband logging criteria:
                # 1. First sample
                # 2. Status change (safe -> danger / danger -> safe)
                # 3. Value delta (temp >= 1.0 C, mq2 >= 30 ppm)
                # 4. Heartbeat timeout (>= 10 mins = 600s)
                should_log = False
                if last_logged_val is None or last_logged_status != status:
                    should_log = True
                else:
                    delta = abs(val - last_logged_val)
                    if device.sensor_type == 'temp' and delta >= 1.0:
                        should_log = True
                    elif device.sensor_type == 'mq2' and delta >= 30.0:
                        should_log = True
                    elif last_logged_time and (timestamp - last_logged_time).total_seconds() >= 600:
                        should_log = True

                if should_log:
                    db.add(SensorReading(
                        device_id=device.id,
                        value=val,
                        status=status,
                        unit=device.unit,
                        created_at=timestamp
                    ))
                    readings_count += 1
                    last_logged_val = val
                    last_logged_status = status
                    last_logged_time = timestamp

                # Update current device state on latest step
                if step == total_steps:
                    device.latest_value = val
                    device.latest_status = status
                    device.last_seen_at = timestamp

        db.commit()
        print(f"Successfully seeded {readings_count} deadband-filtered historical readings!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding history: {e}")
    finally:
        if should_close:
            db.close()

if __name__ == "__main__":
    seed_history()
