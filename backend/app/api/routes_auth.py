from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.auth.dependencies import get_current_user
from app.auth.security import create_access_token, get_password_hash, verify_password
from app.core.config import settings
from app.db.session import get_db
from app.models.building import Building
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserMeResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Mật khẩu xác nhận không khớp")

    if db.scalar(select(User).where(User.email == payload.email.lower())):
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký")

    building_code = payload.building_code.strip().upper()
    building = db.scalar(select(Building).where(Building.code == building_code))
    if building:
        raise HTTPException(status_code=400, detail="Mã tòa nhà đã tồn tại")

    building = Building(name=payload.building_name.strip(), code=building_code)
    db.add(building)
    db.flush()

    user = User(
        name=payload.name.strip(),
        email=payload.email.lower(),
        password_hash=get_password_hash(payload.password),
        role=UserRole.ADMIN_BUILDING.value,
        building_id=building.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    user = db.scalar(select(User).options(joinedload(User.building)).where(User.id == user.id))
    token = create_access_token(user.id, timedelta(minutes=settings.access_token_expire_minutes))
    return TokenResponse(access_token=token, user=UserMeResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).options(joinedload(User.building)).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    token = create_access_token(user.id, timedelta(minutes=settings.access_token_expire_minutes))
    return TokenResponse(access_token=token, user=UserMeResponse.model_validate(user))


@router.get("/me", response_model=UserMeResponse)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.scalar(select(User).options(joinedload(User.building)).where(User.id == current_user.id))
    return UserMeResponse.model_validate(user)
