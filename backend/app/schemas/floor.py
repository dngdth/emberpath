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
    fromNodeId: str | None = None
    toNodeId: str | None = None
    shapeType: str | None = None
    target_floor_id: int | None = None
    points: list[float] | None = None

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
    canvas_width: float = 1600.0
    canvas_height: float = 1000.0
    canvas_shape: str | None = "rect"


class FloorPlanSaveRequest(BaseModel):
    objects: list[PlanObjectIn] = Field(default_factory=list)
    canvas_width: float = 1600.0
    canvas_height: float = 1000.0
    canvas_shape: str | None = "rect"


class BuildingFloorPlanSaveRequest(FloorPlanSaveRequest):
    floor_id: int


class BuildingPlanSaveRequest(BaseModel):
    floors: list[BuildingFloorPlanSaveRequest] = Field(min_length=1)


class SafePathNodeResponse(BaseModel):
    floor_id: int
    floor_name: str
    node_id: str
    node_name: str | None = None
    cost: float


class SafePathSegmentResponse(BaseModel):
    kind: str
    status: str = "safe"
    floor_id: int | None = None
    wire_id: str | None = None
    from_floor_id: int
    to_floor_id: int
    from_node_id: str
    to_node_id: str
    reverse: bool = False


class SafePathResponse(BaseModel):
    algorithm: str
    mode: str
    nodes: list[SafePathNodeResponse]
    segments: list[SafePathSegmentResponse]
    hazard_nodes: list[SafePathNodeResponse] = Field(default_factory=list)
    destination_nodes: list[SafePathNodeResponse] = Field(default_factory=list)
    total_hops: int
    convergence_iterations: int


class FloorCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class FloorRenameRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
