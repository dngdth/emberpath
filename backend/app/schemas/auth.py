import re

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    confirm_password: str = Field(min_length=6, max_length=128)
    building_name: str = Field(min_length=2, max_length=120)
    building_code: str = Field(min_length=2, max_length=50)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not re.fullmatch(r"[^\W\d_]+(?:[ '\-][^\W\d_]+)*", normalized, flags=re.UNICODE):
            raise ValueError("Họ và tên chỉ được chứa chữ cái, khoảng trắng, dấu nháy hoặc dấu gạch nối")
        return normalized

    @field_validator("building_name")
    @classmethod
    def normalize_building_name(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("building_code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        normalized = value.strip().upper()
        if not re.fullmatch(r"[A-Z0-9][A-Z0-9-]{1,49}", normalized):
            raise ValueError("Mã tòa nhà chỉ gồm chữ cái, số và dấu gạch nối")
        return normalized


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserMeResponse"


from app.schemas.user import UserMeResponse
TokenResponse.model_rebuild()
