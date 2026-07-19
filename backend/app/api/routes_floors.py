import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_building_role
from app.db.session import get_db
from app.models.floor import Floor
from app.models.plan import FloorPlan, PlanObject
from app.models.user import User, UserRole
from app.schemas.floor import (
    BuildingPlanSaveRequest,
    FloorCreateRequest,
    FloorPlanResponse,
    FloorPlanSaveRequest,
    FloorRenameRequest,
    FloorResponse,
    SafePathResponse,
)
from app.services.pathfinding import find_safe_path, resolve_floor_led_wires

router = APIRouter(prefix="/floors", tags=["floors"])


def _persist_floor_plan(
    db: Session,
    floor: Floor,
    payload: FloorPlanSaveRequest,
    building_id: int,
) -> FloorPlanResponse:
    plan = db.scalar(
        select(FloorPlan).where(
            FloorPlan.floor_id == floor.id,
            FloorPlan.building_id == building_id,
        )
    )
    if not plan:
        plan = FloorPlan(building_id=building_id, floor_id=floor.id, canvas_json="[]", version=1)
        db.add(plan)
        db.flush()

    saved_objects = resolve_floor_led_wires(
        [obj.model_dump(exclude_none=True, by_alias=True) for obj in payload.objects],
        floor.id,
        floor.name,
    )
    plan.canvas_json = json.dumps(saved_objects)
    plan.canvas_width = payload.canvas_width
    plan.canvas_height = payload.canvas_height
    plan.canvas_shape = payload.canvas_shape
    plan.version += 1

    db.execute(delete(PlanObject).where(PlanObject.plan_id == plan.id))
    db.add_all([
        PlanObject(
            plan_id=plan.id,
            building_id=building_id,
            floor_id=floor.id,
            object_id=str(obj["id"]),
            type=str(obj["type"]),
            name=obj.get("name"),
            x=float(obj.get("x", 0)),
            y=float(obj.get("y", 0)),
            width=obj.get("width"),
            height=obj.get("height"),
            rotation=obj.get("rotation"),
            color=obj.get("color"),
            text_color=obj.get("textColor"),
            font_size=obj.get("fontSize"),
            node_status=obj.get("nodeStatus"),
            locked=bool(obj.get("locked", False)),
            visible=bool(obj.get("visible", True)),
            shape_type=obj.get("shapeType"),
            target_floor_id=obj.get("target_floor_id"),
        )
        for obj in saved_objects
    ])

    return FloorPlanResponse(
        floor_id=floor.id,
        floor_name=floor.name,
        objects=saved_objects,
        version=plan.version,
        canvas_width=plan.canvas_width,
        canvas_height=plan.canvas_height,
        canvas_shape=plan.canvas_shape,
    )


@router.get("", response_model=list[FloorResponse])
def get_floors(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    floors = db.scalars(
        select(Floor).where(Floor.building_id == current_user.building_id).order_by(Floor.order_index.asc(), Floor.id.asc())
    ).all()
    return [FloorResponse(id=f.id, building_id=f.building_id, name=f.name, order_index=f.order_index) for f in floors]


@router.post("", response_model=FloorResponse)
def create_floor(
    payload: FloorCreateRequest,
    current_user: User = Depends(require_building_role(UserRole.ADMIN_BUILDING.value, UserRole.OPERATOR.value)),
    db: Session = Depends(get_db),
):
    next_index = (db.scalar(select(Floor.order_index).where(Floor.building_id == current_user.building_id).order_by(Floor.order_index.desc()).limit(1)) or 0) + 1
    floor = Floor(building_id=current_user.building_id, name=payload.name.strip(), order_index=next_index)
    db.add(floor)
    db.flush()
    db.add(FloorPlan(building_id=current_user.building_id, floor_id=floor.id, canvas_json="[]", version=1))
    db.commit()
    db.refresh(floor)
    return FloorResponse(id=floor.id, building_id=floor.building_id, name=floor.name, order_index=floor.order_index)


@router.patch("/{floor_id}", response_model=FloorResponse)
def rename_floor(
    floor_id: int,
    payload: FloorRenameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    floor = db.scalar(select(Floor).where(Floor.id == floor_id, Floor.building_id == current_user.building_id))
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
    floor.name = payload.name.strip()
    db.commit()
    return FloorResponse(id=floor.id, building_id=floor.building_id, name=floor.name, order_index=floor.order_index)


@router.delete("/{floor_id}")
def delete_floor(floor_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    floor = db.scalar(select(Floor).where(Floor.id == floor_id, Floor.building_id == current_user.building_id))
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
    db.delete(floor)
    db.commit()
    return {"message": "Floor deleted"}


@router.put("/plans/bulk", response_model=list[FloorPlanResponse])
def save_building_plans(
    payload: BuildingPlanSaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    floors = db.scalars(
        select(Floor)
        .where(Floor.building_id == current_user.building_id)
        .order_by(Floor.order_index.asc(), Floor.id.asc())
    ).all()
    floor_by_id = {floor.id: floor for floor in floors}
    payload_ids = [item.floor_id for item in payload.floors]

    if len(payload_ids) != len(set(payload_ids)):
        raise HTTPException(status_code=400, detail="Mỗi tầng chỉ được xuất hiện một lần khi lưu tòa nhà")
    if set(payload_ids) != set(floor_by_id):
        raise HTTPException(status_code=400, detail="Dữ liệu lưu phải bao gồm đầy đủ tất cả tầng của tòa nhà")

    item_by_id = {item.floor_id: item for item in payload.floors}
    responses = [
        _persist_floor_plan(db, floor, item_by_id[floor.id], current_user.building_id)
        for floor in floors
    ]
    db.commit()
    return responses


@router.get("/{floor_id}/plan", response_model=FloorPlanResponse)
def get_floor_plan(floor_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    floor = db.scalar(select(Floor).where(Floor.id == floor_id, Floor.building_id == current_user.building_id))
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
    plan = db.scalar(select(FloorPlan).where(FloorPlan.floor_id == floor_id, FloorPlan.building_id == current_user.building_id))
    if not plan:
        plan = FloorPlan(building_id=current_user.building_id, floor_id=floor_id, canvas_json="[]", version=1)
        db.add(plan)
        db.commit()
        db.refresh(plan)
    objects = resolve_floor_led_wires(
        json.loads(plan.canvas_json or "[]"),
        floor.id,
        floor.name,
    )
    return FloorPlanResponse(
        floor_id=floor.id,
        floor_name=floor.name,
        objects=objects,
        version=plan.version,
        canvas_width=plan.canvas_width if plan.canvas_width is not None else 1600.0,
        canvas_height=plan.canvas_height if plan.canvas_height is not None else 1000.0,
        canvas_shape=plan.canvas_shape if plan.canvas_shape is not None else "rect",
    )


@router.put("/{floor_id}/plan", response_model=FloorPlanResponse)
def save_floor_plan(
    floor_id: int,
    payload: FloorPlanSaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    floor = db.scalar(select(Floor).where(Floor.id == floor_id, Floor.building_id == current_user.building_id))
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
    response = _persist_floor_plan(db, floor, payload, current_user.building_id)
    db.commit()
    return response


@router.get("/{floor_id}/path", response_model=SafePathResponse)
def get_safe_path(
    floor_id: int,
    start_node_id: str,
    end_node_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    floor = db.scalar(select(Floor).where(Floor.id == floor_id, Floor.building_id == current_user.building_id))
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
        
    try:
        path = find_safe_path(db, current_user.building_id, floor_id, start_node_id, end_node_id)
        return path
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
