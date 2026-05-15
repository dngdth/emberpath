from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.sensor import SensorDevice
from app.models.user import User
from app.schemas.sensor import DashboardSummaryResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    building_id = current_user.building_id

    total_mq2 = db.scalar(select(func.count()).select_from(SensorDevice).where(SensorDevice.building_id == building_id, SensorDevice.sensor_type == "mq2")) or 0
    total_temp = db.scalar(select(func.count()).select_from(SensorDevice).where(SensorDevice.building_id == building_id, SensorDevice.sensor_type == "temp")) or 0
    safe_count = db.scalar(select(func.count()).select_from(SensorDevice).where(SensorDevice.building_id == building_id, SensorDevice.latest_status == "safe")) or 0
    danger_count = db.scalar(select(func.count()).select_from(SensorDevice).where(SensorDevice.building_id == building_id, SensorDevice.latest_status == "danger")) or 0
    latest_updated = db.scalar(select(func.max(SensorDevice.last_seen_at)).where(SensorDevice.building_id == building_id))

    return DashboardSummaryResponse(
        total_mq2=total_mq2,
        total_temperature=total_temp,
        safe_count=safe_count,
        danger_count=danger_count,
        latest_updated_at=latest_updated,
    )
