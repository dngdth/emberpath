from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str


class AdminBuildingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    phone: str | None = None
    facility_type: str | None = None
    expected_scale: str | None = None
    created_at: datetime
    users: list[AdminUserResponse]


class ImpersonationResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserMeResponse"
    expires_in_seconds: int


class PasswordResetResponse(BaseModel):
    user_id: int
    email: EmailStr
    temporary_password: str
    message: str


class AuditLogResponse(BaseModel):
    id: int
    admin_id: int
    admin_name: str
    building_id: int
    building_name: str
    action: str
    method: str | None
    path: str | None
    ip_address: str | None
    created_at: datetime


from app.schemas.user import UserMeResponse
ImpersonationResponse.model_rebuild()
