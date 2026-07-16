import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_building_role
from app.db.session import get_db
from app.models.floor import Floor
from app.models.plan import FloorPlan, PlanObject
from app.models.user import User, UserRole
from app.schemas.floor import FloorCreateRequest, FloorPlanResponse, FloorPlanSaveRequest, FloorRenameRequest, FloorResponse
from app.services.pathfinding import find_safe_path

router = APIRouter(prefix="/floors", tags=["floors"])


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
    objects = json.loads(plan.canvas_json or "[]")
    return FloorPlanResponse(
        floor_id=floor.id,
        floor_name=floor.name,
        objects=objects,
        version=plan.version,
        canvas_width=plan.canvas_width if plan.canvas_width is not None else 1600.0,
        canvas_height=plan.canvas_height if plan.canvas_height is not None else 1000.0,
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

    plan = db.scalar(select(FloorPlan).where(FloorPlan.floor_id == floor_id, FloorPlan.building_id == current_user.building_id))
    if not plan:
        plan = FloorPlan(building_id=current_user.building_id, floor_id=floor_id, canvas_json="[]", version=1)
        db.add(plan)
        db.flush()

    plan.canvas_json = json.dumps([obj.model_dump(exclude_none=True, by_alias=True) for obj in payload.objects])
    plan.canvas_width = payload.canvas_width
    plan.canvas_height = payload.canvas_height
    plan.version += 1

    db.execute(delete(PlanObject).where(PlanObject.plan_id == plan.id))
    db.add_all([
        PlanObject(
            plan_id=plan.id,
            building_id=current_user.building_id,
            floor_id=floor.id,
            object_id=obj.id,
            type=obj.type,
            name=obj.name,
            x=obj.x,
            y=obj.y,
            width=obj.width,
            height=obj.height,
            rotation=obj.rotation,
            color=obj.color,
            text_color=obj.textColor,
            font_size=obj.fontSize,
            node_status=obj.nodeStatus,
            locked=obj.locked,
            visible=obj.visible,
        )
        for obj in payload.objects
    ])

    db.commit()
    return FloorPlanResponse(
        floor_id=floor.id,
        floor_name=floor.name,
        objects=payload.objects,
        version=plan.version,
        canvas_width=plan.canvas_width,
        canvas_height=plan.canvas_height,
    )


@router.get("/{floor_id}/path", response_model=list[str])
def get_safe_path(
    floor_id: int,
    start_node_id: str,
    end_node_id: str,
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
