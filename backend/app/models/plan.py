from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FloorPlan(Base):
    __tablename__ = "floor_plans"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id"), nullable=False, index=True)
    floor_id: Mapped[int] = mapped_column(ForeignKey("floors.id"), nullable=False, unique=True)
    canvas_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    floor = relationship("Floor", back_populates="plan")
    objects = relationship("PlanObject", back_populates="plan", cascade="all, delete-orphan")


class PlanObject(Base):
    __tablename__ = "plan_objects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("floor_plans.id"), nullable=False, index=True)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id"), nullable=False, index=True)
    floor_id: Mapped[int] = mapped_column(ForeignKey("floors.id"), nullable=False, index=True)
    object_id: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    x: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    y: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    width: Mapped[float | None] = mapped_column(Float, nullable=True)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)
    rotation: Mapped[float | None] = mapped_column(Float, default=0, nullable=True)
    color: Mapped[str | None] = mapped_column(String(40), nullable=True)
    text_color: Mapped[str | None] = mapped_column(String(40), nullable=True)
    font_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    node_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    plan = relationship("FloorPlan", back_populates="objects")
