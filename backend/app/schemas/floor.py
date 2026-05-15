from pydantic import BaseModel, Field


class PlanObjectIn(BaseModel):
    id: str
    type: str
    name: str | None = None
    x: float
    y: float
    width: float | None = None
    height: float | None = None
    rotation: float | None = 0
    color: str | None = None
    textColor: str | None = None
    fontSize: int | None = None
    nodeStatus: str | None = None
    locked: bool = False
    visible: bool = True


class FloorResponse(BaseModel):
    id: int
    building_id: int
    name: str
    order_index: int


class FloorPlanResponse(BaseModel):
    floor_id: int
    floor_name: str
    objects: list[PlanObjectIn]
    version: int


class FloorPlanSaveRequest(BaseModel):
    objects: list[PlanObjectIn] = Field(default_factory=list)


class FloorCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class FloorRenameRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
