from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class BuildingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str


class UserMeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str
    building_id: int
    building: BuildingResponse
    created_at: datetime
