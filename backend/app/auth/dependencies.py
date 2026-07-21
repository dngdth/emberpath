from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import decode_token
from app.db.session import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.models.user import UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(request: Request, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")

    user = db.scalar(select(User).where(User.id == int(payload["sub"])))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    impersonator_id = payload.get("impersonator_id")
    if impersonator_id is not None:
        impersonator = db.scalar(
            select(User).where(User.id == int(impersonator_id), User.role == UserRole.SUPER_ADMIN.value)
        )
        if not impersonator or payload.get("building_id") != user.building_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid impersonation token")
        db.add(
            AuditLog(
                admin_id=impersonator.id,
                building_id=user.building_id,
                action="impersonated_request",
                method=request.method,
                path=request.url.path,
                ip_address=request.client.host if request.client else None,
            )
        )
        db.commit()
    return user


async def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super Admin permission is required")
    return current_user


def require_building_role(*allowed_roles: str):
    async def checker(current_user: User = Depends(get_current_user)) -> User:
        if allowed_roles and current_user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource")
        return current_user

    return checker
