from datetime import datetime
import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models.lead import LeadStatus


class LeadCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=8, max_length=30)
    email: EmailStr
    company_name: str | None = Field(default=None, max_length=160)
    facility_type: str = Field(min_length=2, max_length=50)
    expected_scale: str = Field(min_length=2, max_length=50)
    requirements: str | None = Field(default=None, max_length=2000)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not re.fullmatch(r"[^\W\d_]+(?:[ '\-][^\W\d_]+)*", normalized, flags=re.UNICODE):
            raise ValueError("Họ và tên chỉ được chứa chữ cái, khoảng trắng, dấu nháy hoặc dấu gạch nối")
        return normalized

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        compact = re.sub(r"[\s().-]", "", value.strip())
        if compact.startswith("+84"):
            compact = f"0{compact[3:]}"
        elif compact.startswith("84"):
            compact = f"0{compact[2:]}"
        if not re.fullmatch(r"0[35789]\d{8}", compact):
            raise ValueError("Số điện thoại di động Việt Nam không hợp lệ")
        return compact

    @field_validator("facility_type", "expected_scale")
    @classmethod
    def strip_required(cls, value: str) -> str:
        return value.strip()

    @field_validator("company_name", "requirements")
    @classmethod
    def strip_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class LeadStatusUpdate(BaseModel):
    status: LeadStatus
    cancellation_reason: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def require_cancellation_reason(self):
        if self.status == LeadStatus.CANCELLED and not (self.cancellation_reason or "").strip():
            raise ValueError("Cancellation reason is required")
        return self


class LeadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    phone: str
    email: EmailStr
    company_name: str | None
    facility_type: str
    expected_scale: str
    requirements: str | None
    status: str
    cancellation_reason: str | None
    building_id: int | None
    created_at: datetime
    updated_at: datetime


class LeadCreatedResponse(BaseModel):
    id: int
    message: str


class ProvisionedAccount(BaseModel):
    building_id: int
    building_name: str
    email: EmailStr
    temporary_password: str


class LeadStatusResponse(BaseModel):
    lead: LeadResponse
    provisioned_account: ProvisionedAccount | None = None
