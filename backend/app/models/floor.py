from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Floor(Base):
    __tablename__ = "floors"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    building = relationship("Building", back_populates="floors")
    plan = relationship("FloorPlan", back_populates="floor", uselist=False, cascade="all, delete-orphan")
    sensor_devices = relationship("SensorDevice", back_populates="floor")
