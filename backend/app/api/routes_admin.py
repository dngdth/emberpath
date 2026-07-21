from datetime import timedelta
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.auth.dependencies import require_super_admin
from app.auth.security import create_access_token, get_password_hash
from app.core.config import settings
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.building import Building
from app.models.floor import Floor
from app.models.lead import CustomerLead, LeadStatus
from app.models.user import User, UserRole
from app.schemas.admin import (
    AdminBuildingResponse,
    AuditLogResponse,
    ImpersonationResponse,
    PasswordResetResponse,
)
from app.schemas.lead import LeadResponse, LeadStatusResponse, LeadStatusUpdate, ProvisionedAccount
from app.schemas.user import UserMeResponse


router = APIRouter(prefix="/admin", tags=["super admin"])


def _request_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    return request.client.host if request.client else None


def _audit(db: Session, admin_id: int, building_id: int, action: str, request: Request) -> None:
    db.add(AuditLog(
        admin_id=admin_id,
        building_id=building_id,
        action=action,
        method=request.method,
        path=request.url.path,
        ip_address=_request_ip(request),
    ))


@router.get("/leads", response_model=list[LeadResponse])
def list_leads(
    lead_status: LeadStatus | None = None,
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    query = select(CustomerLead).order_by(CustomerLead.created_at.desc())
    if lead_status:
        query = query.where(CustomerLead.status == lead_status.value)
    return list(db.scalars(query))


@router.patch("/leads/{lead_id}/status", response_model=LeadStatusResponse)
def update_lead_status(
    lead_id: int,
    payload: LeadStatusUpdate,
    request: Request,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    lead = db.get(CustomerLead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Ticket not found")

    provisioned = None
    if payload.status == LeadStatus.CLOSED and lead.building_id is None:
        if db.scalar(select(User).where(User.email == lead.email.lower())):
            raise HTTPException(status_code=409, detail="Email của khách hàng đã được sử dụng bởi một tài khoản khác")

        building = Building(name=lead.company_name or lead.full_name, code=f"EMB-{lead.id:05d}")
        db.add(building)
        db.flush()
        temporary_password = secrets.token_urlsafe(10)
        customer_admin = User(
            building_id=building.id,
            name=lead.full_name,
            email=lead.email.lower(),
            password_hash=get_password_hash(temporary_password),
            role=UserRole.ADMIN_BUILDING.value,
        )
        db.add_all([customer_admin, Floor(building_id=building.id, name="Tầng 1", order_index=1)])
        lead.building_id = building.id
        provisioned = ProvisionedAccount(
            building_id=building.id,
            building_name=building.name,
            email=customer_admin.email,
            temporary_password=temporary_password,
        )
        _audit(db, admin.id, building.id, "tenant_provisioned", request)

    lead.status = payload.status.value
    lead.cancellation_reason = (
        payload.cancellation_reason.strip()
        if payload.status == LeadStatus.CANCELLED and payload.cancellation_reason
        else None
    )
    if lead.building_id:
        _audit(db, admin.id, lead.building_id, f"lead_status_changed:{lead.status}", request)
    db.commit()
    db.refresh(lead)
    return LeadStatusResponse(lead=LeadResponse.model_validate(lead), provisioned_account=provisioned)


@router.get("/buildings", response_model=list[AdminBuildingResponse])
def list_buildings(_: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    buildings = db.scalars(
        select(Building).options(selectinload(Building.users)).order_by(Building.created_at.desc())
    ).all()
    return [
        AdminBuildingResponse.model_validate(building)
        for building in buildings
        if any(user.role != UserRole.SUPER_ADMIN.value for user in building.users)
    ]


@router.post("/buildings/{building_id}/impersonate", response_model=ImpersonationResponse)
def impersonate_building(
    building_id: int,
    request: Request,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    target = db.scalar(
        select(User)
        .options(joinedload(User.building))
        .where(User.building_id == building_id, User.role == UserRole.ADMIN_BUILDING.value)
        .order_by(User.id)
    )
    if not target:
        raise HTTPException(status_code=404, detail="Doanh nghiệp chưa có tài khoản quản trị")

    expires = timedelta(minutes=settings.impersonation_token_expire_minutes)
    token = create_access_token(
        target.id,
        expires,
        extra_claims={
            "impersonator_id": admin.id,
            "building_id": building_id,
            "token_type": "impersonation",
        },
    )
    _audit(db, admin.id, building_id, "impersonation_started", request)
    db.commit()
    return ImpersonationResponse(
        access_token=token,
        user=UserMeResponse.model_validate(target),
        expires_in_seconds=int(expires.total_seconds()),
    )


@router.post("/users/{user_id}/reset-password", response_model=PasswordResetResponse)
def reset_password(
    user_id: int,
    request: Request,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user or user.role == UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=404, detail="Customer account not found")
    temporary_password = secrets.token_urlsafe(10)
    user.password_hash = get_password_hash(temporary_password)
    _audit(db, admin.id, user.building_id, "password_reset", request)
    db.commit()
    return PasswordResetResponse(
        user_id=user.id,
        email=user.email,
        temporary_password=temporary_password,
        message="Mật khẩu tạm thời chỉ hiển thị một lần. Hãy chuyển cho khách hàng qua kênh an toàn.",
    )


@router.get("/audit-logs", response_model=list[AuditLogResponse])
def list_audit_logs(
    limit: int = 100,
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    safe_limit = min(max(limit, 1), 500)
    logs = db.scalars(
        select(AuditLog)
        .options(joinedload(AuditLog.admin), joinedload(AuditLog.building))
        .order_by(AuditLog.created_at.desc())
        .limit(safe_limit)
    ).all()
    return [
        AuditLogResponse(
            id=log.id,
            admin_id=log.admin_id,
            admin_name=log.admin.name,
            building_id=log.building_id,
            building_name=log.building.name,
            action=log.action,
            method=log.method,
            path=log.path,
            ip_address=log.ip_address,
            created_at=log.created_at,
        )
        for log in logs
    ]
