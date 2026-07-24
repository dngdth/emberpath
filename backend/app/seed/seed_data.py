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
        "fromNodeId": kwargs.get("fromNodeId"),
        "toNodeId": kwargs.get("toNodeId"),
        "target_floor_id": kwargs.get("target_floor_id"),
        "shapeType": kwargs.get("shapeType"),
        "points": kwargs.get("points"),
        "locked": kwargs.get("locked", False),
        "visible": kwargs.get("visible", True),
    }
    return {k: v for k, v in payload.items() if v is not None}


def make_wire(object_id: str, left: dict, right: dict, *via: tuple[float, float]):
    def center(obj: dict) -> tuple[float, float]:
        return (
            float(obj["x"]) + float(obj.get("width", 48)) / 2,
            float(obj["y"]) + float(obj.get("height", 48)) / 2,
        )

    absolute_points = [center(left), *via, center(right)]
    origin_x = min(point[0] for point in absolute_points)
    origin_y = min(point[1] for point in absolute_points)
    points = [coordinate for point in absolute_points for coordinate in (point[0] - origin_x, point[1] - origin_y)]
    return make_obj(
        object_id,
        "led_wire",
        origin_x,
        origin_y,
        name="Dây LED",
        color="#64748b",
        fromNodeId=left["id"],
        toNodeId=right["id"],
        shapeType="polygon",
        points=points,
    )


def _add_plan(db: Session, building_id: int, floor: Floor, objects: list[dict], canvas_width: float = 1100, canvas_height: float = 650, version: int = 1) -> None:
    plan = FloorPlan(
        building_id=building_id,
        floor_id=floor.id,
        canvas_json=json.dumps(objects),
        canvas_width=canvas_width,
        canvas_height=canvas_height,
        version=version,
    )
    db.add(plan)
    db.flush()
    db.add_all([
        PlanObject(
            plan_id=plan.id,
            building_id=building_id,
            floor_id=floor.id,
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
            shape_type=obj.get("shapeType"),
            target_floor_id=obj.get("target_floor_id"),
        )
        for obj in objects
    ])


def _seed_gradient_demo(db: Session) -> None:
    if db.scalar(select(Building).where(Building.code == "GRADIENT-DEMO")):
        return

    building = Building(name="Gradient Demo Tower", code="GRADIENT-DEMO")
    db.add(building)
    db.flush()
    db.add(
        User(
            name="Gradient Demo Admin",
            email="gradient@emberpath.demo",
            password_hash=get_password_hash("123456"),
            role=UserRole.ADMIN_BUILDING.value,
            building_id=building.id,
        )
    )

    import os
    current_dir = os.path.dirname(__file__)
    json_path = os.path.join(current_dir, "gradient_demo.json")
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            floors_data = json.load(f)
        
        for f_data in floors_data:
            floor = Floor(
                building_id=building.id,
                name=f_data["name"],
                order_index=f_data["order_index"]
            )
            db.add(floor)
            db.flush()
            
            for p_data in f_data.get("plans", []):
                _add_plan(
                    db,
                    building.id,
                    floor,
                    p_data["canvas_json"],
                    canvas_width=p_data.get("canvas_width", 1100),
                    canvas_height=p_data.get("canvas_height", 650),
                    version=p_data.get("version", 1)
                )
    else:
        floors = [
            Floor(building_id=building.id, name=f"Tầng {index}", order_index=index)
            for index in range(1, 5)
        ]
        db.add_all(floors)
        db.flush()

        def base_objects(index: int) -> list[dict]:
            return [
                make_obj("floor-base", "floor_base", 35, 45, width=1030, height=550, name=f"Mặt bằng tầng {index}", color="#172033", locked=True),
                make_obj("floor-label", "label", 65, 68, width=360, height=40, name=f"GRADIENT FIELD • TẦNG {index}", fontSize=24, color="#e2e8f0"),
                make_obj("wall-top", "wall", 55, 125, width=990, height=8, name="Tường", color="#475569"),
                make_obj("wall-bottom", "wall", 55, 545, width=990, height=8, name="Tường", color="#475569"),
            ]

        f1_entry = make_obj("f1-entry", "sensor", 120, 310, width=54, height=54, name="Node sảnh tầng 1")
        f1_junction = make_obj("f1-junction", "sensor", 350, 310, width=54, height=54, name="Node phân nhánh")
        f1_safe = make_obj("f1-safe", "sensor", 590, 175, width=54, height=54, name="Nhánh an toàn")
        f1_danger = make_obj("f1-danger", "sensor", 590, 430, width=54, height=54, name="Nhánh có cháy", nodeStatus="danger")
        f1_stairs = make_obj("f1-stairs-a", "stairs", 850, 310, width=92, height=76, name="Cầu thang A")
        f1_exit = make_obj("f1-exit", "exit", 900, 155, width=105, height=48, name="LỐI THOÁT")
        floor1_objects = [
            *base_objects(1), f1_entry, f1_junction, f1_safe, f1_danger, f1_stairs, f1_exit,
            make_wire("f1-wire-entry-junction", f1_entry, f1_junction),
            make_wire("f1-wire-stairs-junction", f1_stairs, f1_junction),
            make_wire("f1-wire-junction-safe", f1_junction, f1_safe),
            make_wire("f1-wire-safe-exit", f1_safe, f1_exit),
            make_wire("f1-wire-junction-danger", f1_junction, f1_danger),
            make_wire("f1-wire-danger-exit", f1_danger, f1_exit),
        ]

        all_objects = [floor1_objects]
        for index in range(2, 5):
            previous_floor = floors[index - 2]
            start = make_obj(f"f{index}-start", "sensor", 115, 300, width=54, height=54, name=f"Node xuất phát T{index}", nodeStatus="safe")
            upper = make_obj(f"f{index}-upper", "sensor", 390, 175, width=54, height=54, name="Node hành lang Bắc")
            lower = make_obj(f"f{index}-lower", "sensor", 390, 420, width=54, height=54, name="Node hành lang Nam")
            merge = make_obj(f"f{index}-merge", "sensor", 650, 300, width=54, height=54, name="Node hợp tuyến")
            stairs = make_obj(
                f"f{index}-stairs-a",
                "stairs",
                850,
                300,
                width=92,
                height=76,
                name="Cầu thang A",
                target_floor_id=previous_floor.id,
            )
            objects = [
                *base_objects(index), start, upper, lower, merge, stairs,
                make_wire(f"f{index}-wire-start-upper", start, upper),
                make_wire(f"f{index}-wire-start-lower", start, lower),
                make_wire(f"f{index}-wire-upper-merge", upper, merge),
                make_wire(f"f{index}-wire-lower-merge", lower, merge),
                make_wire(f"f{index}-wire-merge-stairs", merge, stairs),
            ]
            all_objects.append(objects)

        for floor, objects in zip(floors, all_objects):
            _add_plan(db, building.id, floor, objects)

    db.commit()


def _ensure_super_admin(db: Session) -> None:
    if db.scalar(select(User).where(User.role == UserRole.SUPER_ADMIN.value)):
        return
    building = db.scalar(select(Building).order_by(Building.id))
    if not building:
        return
    db.add(
        User(
            name="Emberpath Super Admin",
            email="superadmin@emberpath.demo",
            password_hash=get_password_hash("123456"),
            role=UserRole.SUPER_ADMIN.value,
            building_id=building.id,
        )
    )
    db.commit()


def seed_database(db: Session) -> None:
    if db.scalar(select(Building).limit(1)):
        _ensure_super_admin(db)
        _seed_gradient_demo(db)
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

    # Chi giu lai sensor that dang chay tu ESP32
    device_specs = [
        (building_a.id, floor1.id, "Master Node", "temp-master", "Temp Master", "temp", 50, 26, "C"),
        (building_a.id, floor1.id, "Master Node", "mq2-master", "MQ2 Master", "mq2", 600, 0, "raw"),
        (building_a.id, floor1.id, "Satellite 1", "temp-sat-1", "Temp Sat 1", "temp", 50, 26, "C"),
        (building_a.id, floor1.id, "Satellite 1", "mq2-sat-1", "MQ2 Sat 1", "mq2", 600, 0, "raw"),
        (building_a.id, floor1.id, "Satellite 2", "temp-sat-2", "Temp Sat 2", "temp", 50, 26, "C"),
        (building_a.id, floor1.id, "Satellite 2", "mq2-sat-2", "MQ2 Sat 2", "mq2", 600, 0, "raw"),
        (building_a.id, floor1.id, "Satellite 3", "temp-sat-3", "Temp Sat 3", "temp", 50, 26, "C"),
        (building_a.id, floor1.id, "Satellite 3", "mq2-sat-3", "MQ2 Sat 3", "mq2", 600, 0, "raw"),
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
    _ensure_super_admin(db)
    _seed_gradient_demo(db)
