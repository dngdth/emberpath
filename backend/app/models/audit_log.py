from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    admin_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    method: Mapped[str | None] = mapped_column(String(10), nullable=True)
    path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    admin = relationship("User")
    building = relationship("Building")
