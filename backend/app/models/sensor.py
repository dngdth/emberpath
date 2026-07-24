from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SensorDevice(Base):
    __tablename__ = "sensor_devices"
    __table_args__ = (
        # device_id là unique trong phạm vi 1 building, nhưng có thể trùng giữa các buildings
        # (cho phép cùng device_id sync realtime tới nhiều buildings như Gradient Demo)
        UniqueConstraint("building_id", "device_id", name="uq_building_device_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id"), nullable=False, index=True)
    floor_id: Mapped[int | None] = mapped_column(ForeignKey("floors.id"), nullable=True, index=True)
    room_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    device_id: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    sensor_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    threshold: Mapped[float] = mapped_column(Float, nullable=False)
    latest_value: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    latest_status: Mapped[str] = mapped_column(String(20), default="safe", nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    building = relationship("Building", back_populates="sensor_devices")
    floor = relationship("Floor", back_populates="sensor_devices")
    readings = relationship("SensorReading", back_populates="device", cascade="all, delete-orphan")


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("sensor_devices.id"), nullable=False, index=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    device = relationship("SensorDevice", back_populates="readings")
