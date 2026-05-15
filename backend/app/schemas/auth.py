from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    confirm_password: str = Field(min_length=6, max_length=128)
    building_name: str = Field(min_length=2, max_length=120)
    building_code: str = Field(min_length=2, max_length=50)

    @field_validator("building_code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        return value.strip().upper()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserMeResponse"


from app.schemas.user import UserMeResponse
TokenResponse.model_rebuild()
