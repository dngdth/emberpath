import json
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import get_password_hash
from app.models.building import Building
from app.models.floor import Floor
from app.models.plan import FloorPlan, PlanObject
from app.models.sensor import SensorDevice, SensorReading
from app.models.user import User, UserRole
from app.utils.status import evaluate_sensor_status


def make_obj(object_id: str, type_: str, x: float, y: float, **kwargs):
    payload = {
        "id": object_id,
        "type": type_,
        "name": kwargs.get("name"),
        "x": x,
        "y": y,
        "width": kwargs.get("width"),
        "height": kwargs.get("height"),
        "rotation": kwargs.get("rotation", 0),
        "color": kwargs.get("color"),
        "textColor": kwargs.get("textColor"),
        "fontSize": kwargs.get("fontSize"),
        "nodeStatus": kwargs.get("nodeStatus"),
        "locked": kwargs.get("locked", False),
        "visible": kwargs.get("visible", True),
    }
    return {k: v for k, v in payload.items() if v is not None}


def seed_database(db: Session) -> None:
    if db.scalar(select(Building).limit(1)):
        return

    building_a = Building(name="Building A", code="B01")
    building_b = Building(name="Building B", code="B02")
    db.add_all([building_a, building_b])
    db.flush()

    users = [
        User(name="Alice Admin", email="admin@buildinga.demo", password_hash=get_password_hash("123456"), role=UserRole.ADMIN_BUILDING.value, building_id=building_a.id),
        User(name="Oscar Operator", email="operator@buildinga.demo", password_hash=get_password_hash("123456"), role=UserRole.OPERATOR.value, building_id=building_a.id),
        User(name="Binh Admin", email="admin@buildingb.demo", password_hash=get_password_hash("123456"), role=UserRole.ADMIN_BUILDING.value, building_id=building_b.id),
    ]
    db.add_all(users)

    floor1 = Floor(building_id=building_a.id, name="Tầng 1", order_index=1)
    floor2 = Floor(building_id=building_a.id, name="Tầng 2", order_index=2)
    floorb1 = Floor(building_id=building_b.id, name="Ground Floor", order_index=1)
    db.add_all([floor1, floor2, floorb1])
    db.flush()

    floor1_objects = [
        make_obj("room-lobby", "room", 80, 80, width=340, height=180, name="Lobby", color="#1f2937", textColor="#f9fafb"),
        make_obj("room-control", "room", 480, 70, width=260, height=160, name="Control Room", color="#0f766e", textColor="#f9fafb"),
        make_obj("door-1", "door", 405, 155, width=18, height=52, name="Door"),
        make_obj("exit-1", "exit", 760, 120, width=80, height=30, name="EXIT", color="#22c55e"),
        make_obj("stairs-1", "stairs", 760, 250, width=80, height=60, name="Stairs"),
        make_obj("mq2-01", "mq2", 230, 290, width=40, height=40, name="MQ2-Lobby"),
        make_obj("temp-01", "temp", 540, 250, width=40, height=40, name="Temp-Control"),
        *[make_obj(f"led-l1-{i}", "led", 120 + i * 32, 380, width=18, height=18, name=f"LED {i}", nodeStatus="safe" if i % 4 else "danger") for i in range(1, 13)],
        make_obj("label-1", "label", 90, 40, width=160, height=40, name="Escape Mesh - Floor 1", fontSize=22, color="#f8fafc"),
    ]
    floor2_objects = [
        make_obj("room-meeting", "room", 110, 90, width=280, height=170, name="Meeting Room", color="#1d4ed8", textColor="#f8fafc"),
        make_obj("room-office", "room", 450, 90, width=330, height=200, name="Open Office", color="#7c3aed", textColor="#f8fafc"),
        make_obj("door-2", "door", 395, 150, width=18, height=46, name="Door"),
        make_obj("exit-2", "exit", 760, 110, width=80, height=30, name="EXIT", color="#22c55e"),
        make_obj("stairs-2", "stairs", 760, 250, width=80, height=60, name="Stairs"),
        make_obj("mq2-02", "mq2", 220, 300, width=40, height=40, name="MQ2-Meeting"),
        make_obj("temp-02", "temp", 610, 315, width=40, height=40, name="Temp-Office"),
        *[make_obj(f"led-l2-{i}", "led", 130 + i * 35, 390, width=18, height=18, name=f"LED {i}", nodeStatus="safe" if i % 5 else "danger") for i in range(1, 11)],
        make_obj("label-2", "label", 115, 45, width=180, height=40, name="Escape Mesh - Floor 2", fontSize=22, color="#f8fafc"),
    ]
    floorb_objects = [
        make_obj("room-security", "room", 100, 80, width=300, height=150, name="Security", color="#334155", textColor="#f8fafc"),
        make_obj("exit-b1", "exit", 450, 100, width=80, height=30, name="EXIT", color="#22c55e"),
        make_obj("mq2-b1", "mq2", 180, 260, width=40, height=40, name="MQ2-Security"),
        make_obj("temp-b1", "temp", 250, 260, width=40, height=40, name="Temp-Security"),
        *[make_obj(f"led-b1-{i}", "led", 110 + i * 26, 340, width=18, height=18, name=f"LED {i}", nodeStatus="safe") for i in range(1, 8)],
    ]

    plans = [
        FloorPlan(building_id=building_a.id, floor_id=floor1.id, canvas_json=json.dumps(floor1_objects), version=1),
        FloorPlan(building_id=building_a.id, floor_id=floor2.id, canvas_json=json.dumps(floor2_objects), version=1),
        FloorPlan(building_id=building_b.id, floor_id=floorb1.id, canvas_json=json.dumps(floorb_objects), version=1),
    ]
    db.add_all(plans)
    db.flush()

    for plan, objects in zip(plans, [floor1_objects, floor2_objects, floorb_objects]):
        db.add_all([
            PlanObject(
                plan_id=plan.id,
                building_id=plan.building_id,
                floor_id=plan.floor_id,
                object_id=obj["id"],
                type=obj["type"],
                name=obj.get("name"),
                x=obj["x"],
                y=obj["y"],
                width=obj.get("width"),
                height=obj.get("height"),
                rotation=obj.get("rotation", 0),
                color=obj.get("color"),
                text_color=obj.get("textColor"),
                font_size=obj.get("fontSize"),
                node_status=obj.get("nodeStatus"),
                locked=obj.get("locked", False),
                visible=obj.get("visible", True),
            )
            for obj in objects
        ])

    device_specs = [
        (building_a.id, floor1.id, "Lobby", "mq2-01", "MQ2 Lobby A", "mq2", 240, 180, "ppm"),
        (building_a.id, floor1.id, "Lobby", "mq2-02", "MQ2 Corridor A", "mq2", 240, 205, "ppm"),
        (building_a.id, floor1.id, "Control Room", "mq2-03", "MQ2 Control A", "mq2", 240, 265, "ppm"),
        (building_a.id, floor1.id, "North Exit", "mq2-04", "MQ2 Exit A", "mq2", 240, 330, "ppm"),
        (building_a.id, floor2.id, "Meeting Room", "mq2-05", "MQ2 Meeting A", "mq2", 240, 190, "ppm"),
        (building_a.id, floor2.id, "Open Office", "mq2-06", "MQ2 Office A", "mq2", 240, 270, "ppm"),
        (building_a.id, floor2.id, "Open Office", "mq2-07", "MQ2 South Wing A", "mq2", 240, 225, "ppm"),
        (building_a.id, floor2.id, "Stairs", "mq2-08", "MQ2 Stairwell A", "mq2", 240, 310, "ppm"),
        (building_a.id, floor1.id, "Lobby", "temp-01", "Temp Lobby A", "temp", 40, 29, "C"),
        (building_a.id, floor1.id, "Control Room", "temp-02", "Temp Control A", "temp", 40, 34, "C"),
        (building_a.id, floor1.id, "Lobby", "temp-03", "Temp Corridor A", "temp", 40, 37, "C"),
        (building_a.id, floor1.id, "Exit", "temp-04", "Temp Exit A", "temp", 40, 42, "C"),
        (building_a.id, floor2.id, "Meeting Room", "temp-05", "Temp Meeting A", "temp", 40, 31, "C"),
        (building_a.id, floor2.id, "Open Office", "temp-06", "Temp Office A", "temp", 40, 38, "C"),
        (building_a.id, floor2.id, "Pantry", "temp-07", "Temp Pantry A", "temp", 40, 44, "C"),
        (building_a.id, floor2.id, "Server Corner", "temp-08", "Temp Server A", "temp", 40, 36, "C"),
        (building_b.id, floorb1.id, "Security", "mq2-b1", "MQ2 Security B", "mq2", 240, 170, "ppm"),
        (building_b.id, floorb1.id, "Security", "temp-b1", "Temp Security B", "temp", 40, 26, "C"),
    ]
    now = datetime.utcnow()
    for building_id, floor_id, room_name, device_id, name, sensor_type, threshold, latest_value, unit in device_specs:
        status = evaluate_sensor_status(sensor_type, latest_value, threshold)
        device = SensorDevice(
            building_id=building_id,
            floor_id=floor_id,
            room_name=room_name,
            device_id=device_id,
            name=name,
            sensor_type=sensor_type,
            threshold=threshold,
            latest_value=latest_value,
            latest_status=status,
            unit=unit,
            last_seen_at=now,
        )
        db.add(device)
        db.flush()
        db.add(SensorReading(device_id=device.id, value=latest_value, status=status, unit=unit, created_at=now))

    db.commit()
