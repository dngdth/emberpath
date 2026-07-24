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


def _extended_satellite_specs(building_id: int, floor_id: int) -> list[tuple]:
    return [
        (building_id, floor_id, f"Satellite {node_id}", f"temp-sat-{node_id}", f"Temp Sat {node_id}", "temp", 50, 26, "C")
        for node_id in range(4, 7)
    ] + [
        (building_id, floor_id, f"Satellite {node_id}", f"mq2-sat-{node_id}", f"MQ2 Sat {node_id}", "mq2", 600, 0, "raw")
        for node_id in range(4, 7)
    ]


def ensure_extended_satellite_devices(db: Session) -> None:
    """Add Node 4-6 sensor channels to an existing B01 database once."""

    building = db.scalar(select(Building).where(Building.code == "B01"))
    if not building:
        return

    floor = db.scalar(
        select(Floor)
        .where(Floor.building_id == building.id)
        .order_by(Floor.order_index.asc(), Floor.id.asc())
    )
    if not floor:
        return

    existing_device_ids = set(
        db.scalars(
            select(SensorDevice.device_id).where(SensorDevice.building_id == building.id)
        ).all()
    )
    now = datetime.utcnow()
    added = False
    for building_id, floor_id, room_name, device_id, name, sensor_type, threshold, latest_value, unit in _extended_satellite_specs(building.id, floor.id):
        if device_id in existing_device_ids:
            continue
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
        db.add(SensorReading(
            device_id=device.id,
            value=latest_value,
            status=status,
            unit=unit,
            created_at=now,
        ))
        existing_device_ids.add(device_id)
        added = True

    if added:
        db.commit()


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


def _add_plan(db: Session, building_id: int, floor: Floor, objects: list[dict]) -> None:
    plan = FloorPlan(
        building_id=building_id,
        floor_id=floor.id,
        canvas_json=json.dumps(objects),
        canvas_width=1100,
        canvas_height=650,
        version=1,
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
    building = db.scalar(select(Building).where(Building.code == "GRADIENT-DEMO"))
    if building:
        has_readings = db.scalar(
            select(SensorReading)
            .join(SensorDevice)
            .where(SensorDevice.building_id == building.id)
            .limit(1)
        )
        if not has_readings:
            from app.seed.seed_history import seed_history
            seed_history(db)
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

    floors = [
        Floor(building_id=building.id, name=f"Tầng {index}", order_index=index)
        for index in range(1, 5)
    ]
    db.add_all(floors)
    db.flush()

    # ---------------------------------------------------------------
    # Sensor devices: cùng device_id với ESP32 thực (Building A)
    # Backend ingest sẽ cập nhật cả 2 buildings khi ESP32 gửi data
    # Mapping vật lý: Master→f1-entry, Sat1→f1-junction, Sat2→f1-safe, Sat3→f1-danger
    # ---------------------------------------------------------------
    gd_floor1 = floors[0]
    gd_device_specs = [
        (gd_floor1.id, "Node sảnh (Master)",   "temp-master", "Temp Master",   "temp", 50,  26.0, "C"),
        (gd_floor1.id, "Node sảnh (Master)",   "mq2-master",  "MQ2 Master",    "mq2",  600, 0.0,  "raw"),
        (gd_floor1.id, "Node phân nhánh (Sat1)","temp-sat-1",  "Temp Vệ tinh 1","temp", 50,  26.0, "C"),
        (gd_floor1.id, "Node phân nhánh (Sat1)","mq2-sat-1",   "MQ2 Vệ tinh 1", "mq2",  600, 0.0,  "raw"),
        (gd_floor1.id, "Nhánh an toàn (Sat2)",  "temp-sat-2",  "Temp Vệ tinh 2","temp", 50,  26.0, "C"),
        (gd_floor1.id, "Nhánh an toàn (Sat2)",  "mq2-sat-2",   "MQ2 Vệ tinh 2", "mq2",  600, 0.0,  "raw"),
        (gd_floor1.id, "Nhánh cháy (Sat3)",     "temp-sat-3",  "Temp Vệ tinh 3","temp", 50,  26.0, "C"),
        (gd_floor1.id, "Nhánh cháy (Sat3)",     "mq2-sat-3",   "MQ2 Vệ tinh 3", "mq2",  600, 0.0,  "raw"),
    ]
    now = datetime.utcnow()
    for floor_id, room_name, device_id, name, sensor_type, threshold, latest_value, unit in gd_device_specs:
        status = evaluate_sensor_status(sensor_type, latest_value, threshold)
        gd_dev = SensorDevice(
            building_id=building.id,
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
        db.add(gd_dev)
        db.flush()
        db.add(SensorReading(device_id=gd_dev.id, value=latest_value, status=status, unit=unit, created_at=now))

    def base_objects(index: int) -> list[dict]:
        return [
            make_obj("floor-base", "floor_base", 35, 45, width=1030, height=550, name=f"Mặt bằng tầng {index}", color="#172033", locked=True),
            make_obj("floor-label", "label", 65, 68, width=360, height=40, name=f"GRADIENT FIELD • TẦNG {index}", fontSize=24, color="#e2e8f0"),
            make_obj("wall-top", "wall", 55, 125, width=990, height=8, name="Tường", color="#475569"),
            make_obj("wall-bottom", "wall", 55, 545, width=990, height=8, name="Tường", color="#475569"),
        ]

    # Tầng 1: ID node = device_id ESP32 → node tự đổi màu đỏ/xanh theo realtime
    # Master ở sảnh vào, Sat1 ở ngã tư, Sat2 nhánh an toàn, Sat3 nhánh cháy
    f1_entry   = make_obj("temp-master", "sensor", 120, 310, width=54, height=54, name="Node sảnh tầng 1")
    f1_junction= make_obj("temp-sat-1",  "sensor", 350, 310, width=54, height=54, name="Node phân nhánh")
    f1_safe    = make_obj("temp-sat-2",  "sensor", 590, 175, width=54, height=54, name="Nhánh an toàn")
    f1_danger  = make_obj("temp-sat-3",  "sensor", 590, 430, width=54, height=54, name="Nhánh có cháy")
    f1_stairs  = make_obj("f1-stairs-a", "stairs", 850, 310, width=92, height=76, name="Cầu thang A")
    f1_exit    = make_obj("f1-exit",     "exit",   900, 155, width=105, height=48, name="LỐI THOÁT")

    floor1_objects = [
        *base_objects(1),
        f1_entry, f1_junction, f1_safe, f1_danger, f1_stairs, f1_exit,
        make_wire("f1-wire-entry-junction",   f1_entry,   f1_junction),
        make_wire("f1-wire-stairs-junction",  f1_stairs,  f1_junction),
        make_wire("f1-wire-junction-safe",    f1_junction, f1_safe),
        make_wire("f1-wire-safe-exit",        f1_safe,    f1_exit),
        make_wire("f1-wire-junction-danger",  f1_junction, f1_danger),
        make_wire("f1-wire-danger-exit",      f1_danger,  f1_exit),
    ]

    all_objects = [floor1_objects]
    for index in range(2, 5):
        previous_floor = floors[index - 2]
        start = make_obj(f"f{index}-start", "sensor", 115, 300, width=54, height=54, name=f"Node xuất phát T{index}")
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

    has_readings = db.scalar(
        select(SensorReading)
        .join(SensorDevice)
        .where(SensorDevice.building_id == building.id)
        .limit(1)
    )
    if not has_readings:
        from app.seed.seed_history import seed_history
        seed_history(db)


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

    # ============================================================
    # TẦNG 1 - BUILDING A: Topology thực của mạng ESP32 ESP-NOW
    # Vật lý: ExitA -- Sat1 -- Master -- Sat2 -- Sat3 -- ExitB
    # Canvas: 1100x650
    # ============================================================
    # Vị trí trung tâm cho từng "node" vật lý:
    #  - Master  : ~(430, 300) => temp: (405,278), mq2: (455,278)
    #  - Sat 1   : ~(600, 165) => temp: (575,143), mq2: (625,143)
    #  - Sat 2   : ~(650, 390) => temp: (625,368), mq2: (675,368)
    #  - Sat 3   : ~(830, 390) => temp: (805,368), mq2: (855,368)
    #  - Exit A  : ~(790, 100)
    #  - Exit B  : ~(980, 390)
    #  - Stairs  : ~(160, 290) (lên Tầng 2)

    # Sensor objects - ID khớp chính xác device_id ESP32
    f1_temp_master = make_obj("temp-master", "temp", 405, 278, width=48, height=48, name="Temp Master")
    f1_mq2_master  = make_obj("mq2-master",  "mq2",  460, 278, width=48, height=48, name="MQ2 Master")
    f1_temp_sat1   = make_obj("temp-sat-1",  "temp", 565, 148, width=48, height=48, name="Temp Vệ tinh 1")
    f1_mq2_sat1    = make_obj("mq2-sat-1",   "mq2",  620, 148, width=48, height=48, name="MQ2 Vệ tinh 1")
    f1_temp_sat2   = make_obj("temp-sat-2",  "temp", 620, 378, width=48, height=48, name="Temp Vệ tinh 2")
    f1_mq2_sat2    = make_obj("mq2-sat-2",   "mq2",  675, 378, width=48, height=48, name="MQ2 Vệ tinh 2")
    f1_temp_sat3   = make_obj("temp-sat-3",  "temp", 805, 378, width=48, height=48, name="Temp Vệ tinh 3")
    f1_mq2_sat3    = make_obj("mq2-sat-3",   "mq2",  860, 378, width=48, height=48, name="MQ2 Vệ tinh 3")

    # Exits & Stairs
    f1_exit_a  = make_obj("exit-a",   "exit",   870, 100, width=100, height=38, name="LỐI THOÁT A", color="#22c55e")
    f1_exit_b  = make_obj("exit-b",   "exit",   960, 378, width=100, height=38, name="LỐI THOÁT B", color="#22c55e")
    f1_stairs1 = make_obj("stairs-1", "stairs", 145, 278, width=88, height=72,  name="Cầu thang")

    # Label
    f1_label = make_obj("label-1", "label", 65, 58, width=500, height=38,
                        name="TẦNG 1 • ESP32 MESH NETWORK (Building A)", fontSize=20, color="#e2e8f0")

    # Floor base & walls
    f1_base      = make_obj("floor-base", "floor_base", 35, 45, width=1030, height=550,
                             name="Mặt bằng tầng 1", color="#172033", locked=True)
    f1_wall_top  = make_obj("wall-top",    "wall", 55, 125, width=990, height=8, name="Tường", color="#475569")
    f1_wall_bot  = make_obj("wall-bottom", "wall", 55, 545, width=990, height=8, name="Tường", color="#475569")

    # LED wires — kết nối theo topology vật lý ESP-NOW:
    # Edge 1: Sat1 ↔ ExitA  (LED 0-5)
    # Edge 2: Sat1 ↔ Master  (LED 6-13)
    # Edge 3: Master ↔ Sat2  (LED 14-21)
    # Edge 4: Sat2 ↔ Sat3   (LED 22-26)
    # Edge 5: Sat3 ↔ ExitB  (LED 27-29)
    f1_wire_sat1_exita  = make_wire("f1-wire-sat1-exita",  f1_temp_sat1,   f1_exit_a)
    f1_wire_sat1_master = make_wire("f1-wire-sat1-master", f1_temp_sat1,   f1_temp_master)
    f1_wire_master_sat2 = make_wire("f1-wire-master-sat2", f1_temp_master, f1_temp_sat2)
    f1_wire_sat2_sat3   = make_wire("f1-wire-sat2-sat3",   f1_temp_sat2,   f1_temp_sat3)
    f1_wire_sat3_exitb  = make_wire("f1-wire-sat3-exitb",  f1_temp_sat3,   f1_exit_b)
    f1_wire_master_stair = make_wire("f1-wire-master-stair", f1_temp_master, f1_stairs1)

    floor1_objects = [
        f1_base, f1_wall_top, f1_wall_bot, f1_label,
        f1_stairs1, f1_exit_a, f1_exit_b,
        f1_temp_master, f1_mq2_master,
        f1_temp_sat1,   f1_mq2_sat1,
        f1_temp_sat2,   f1_mq2_sat2,
        f1_temp_sat3,   f1_mq2_sat3,
        f1_wire_sat1_exita,
        f1_wire_sat1_master,
        f1_wire_master_sat2,
        f1_wire_sat2_sat3,
        f1_wire_sat3_exitb,
        f1_wire_master_stair,
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
        *_extended_satellite_specs(building_a.id, floor1.id),
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
