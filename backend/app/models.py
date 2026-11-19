"""Database tables (SQLAlchemy ORM models).

Facility 1──* StorageZone 1──* SensorReading
Facility 1──* BloodUnit  *──1 StorageZone
Alert -> optionally linked to a facility, zone and/or blood unit
"""
from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    """Current UTC time stored as a naive datetime.

    SQLite has no timezone type, so every timestamp in the database is
    UTC by convention. The API adds the 'Z' suffix when sending it out.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Facility(Base):
    __tablename__ = "facilities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    location: Mapped[str] = mapped_column(String(120))
    contact: Mapped[str] = mapped_column(String(60), default="")

    zones: Mapped[list["StorageZone"]] = relationship(back_populates="facility")
    units: Mapped[list["BloodUnit"]] = relationship(back_populates="facility")


class StorageZone(Base):
    """One piece of storage equipment (fridge, incubator, freezer) in a facility."""

    __tablename__ = "storage_zones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"))
    name: Mapped[str] = mapped_column(String(120))
    zone_type: Mapped[str] = mapped_column(String(40))  # key of ZONE_TYPES
    min_temp: Mapped[float] = mapped_column(Float)
    max_temp: Mapped[float] = mapped_column(Float)
    setpoint: Mapped[float] = mapped_column(Float)

    # Simulation state (would not exist for real hardware)
    fault_mode: Mapped[str] = mapped_column(String(20), default="NONE")  # NONE | HIGH | LOW
    current_temp: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_humidity: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_reading_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    facility: Mapped[Facility] = relationship(back_populates="zones")
    readings: Mapped[list["SensorReading"]] = relationship(back_populates="zone")


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    zone_id: Mapped[int] = mapped_column(ForeignKey("storage_zones.id"), index=True)
    temperature: Mapped[float] = mapped_column(Float)
    humidity: Mapped[float] = mapped_column(Float)
    in_range: Mapped[bool] = mapped_column(Boolean, default=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)

    zone: Mapped[StorageZone] = relationship(back_populates="readings")


class BloodUnit(Base):
    __tablename__ = "blood_units"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    unit_code: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    blood_group: Mapped[str] = mapped_column(String(4), index=True)
    component: Mapped[str] = mapped_column(String(4), index=True)  # WB | RBC | PLT | FFP
    volume_ml: Mapped[int] = mapped_column(Integer)
    collected_on: Mapped[date] = mapped_column(Date)
    expires_on: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(12), default="AVAILABLE", index=True)
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"))
    zone_id: Mapped[int] = mapped_column(ForeignKey("storage_zones.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    facility: Mapped[Facility] = relationship(back_populates="units")
    zone: Mapped[StorageZone] = relationship()


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # TEMP_HIGH | TEMP_LOW | EXPIRING_SOON | EXPIRED | LOW_STOCK
    alert_type: Mapped[str] = mapped_column(String(20), index=True)
    severity: Mapped[str] = mapped_column(String(10))  # CRITICAL | WARNING | INFO
    message: Mapped[str] = mapped_column(String(300))
    # dedupe_key stops the engine from raising the same open alert repeatedly
    dedupe_key: Mapped[str] = mapped_column(String(120), index=True)
    facility_id: Mapped[int | None] = mapped_column(ForeignKey("facilities.id"), nullable=True)
    zone_id: Mapped[int | None] = mapped_column(ForeignKey("storage_zones.id"), nullable=True)
    unit_id: Mapped[int | None] = mapped_column(ForeignKey("blood_units.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    acknowledged_by: Mapped[str | None] = mapped_column(String(60), nullable=True)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    facility: Mapped[Facility | None] = relationship()
    zone: Mapped[StorageZone | None] = relationship()
