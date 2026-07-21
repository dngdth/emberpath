from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class LeadStatus(str, Enum):
    NEW = "new"
    PROCESSING = "processing"
    CLOSED = "closed"
    CANCELLED = "cancelled"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class CustomerLead(Base):
    __tablename__ = "customer_leads"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    company_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    facility_type: Mapped[str] = mapped_column(String(50), nullable=False)
    expected_scale: Mapped[str] = mapped_column(String(50), nullable=False)
    requirements: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default=LeadStatus.NEW.value, nullable=False, index=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    building_id: Mapped[int | None] = mapped_column(ForeignKey("buildings.id"), nullable=True, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    building = relationship("Building")
