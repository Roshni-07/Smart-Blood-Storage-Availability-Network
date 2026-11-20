"""Pydantic schemas: the shape of data going in and out of the API.

These are the "API contract" — the frontend only relies on these shapes.
"""
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

from .constants import BLOOD_GROUPS, COMPONENTS, UNIT_STATUSES

# All DB timestamps are UTC; send them with a trailing Z so browsers
# convert them to the viewer's local time (e.g. IST) correctly.
UtcDatetime = Annotated[
    datetime,
    PlainSerializer(lambda v: v.replace(microsecond=0).isoformat() + "Z", return_type=str),
]

BloodGroup = Literal["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
Component = Literal["WB", "RBC", "PLT", "FFP", "TFP"]
UnitStatus = Literal["AVAILABLE", "RESERVED", "ISSUED", "EXPIRED", "DISCARDED"]

assert set(BloodGroup.__args__) == set(BLOOD_GROUPS)
assert set(Component.__args__) == set(COMPONENTS)
assert set(UnitStatus.__args__) == set(UNIT_STATUSES)


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Facilities & storage ----------
class ZoneOut(ORM):
    id: int
    facility_id: int
    name: str
    zone_type: str
    min_temp: float
    max_temp: float
    setpoint: float
    fault_mode: str
    current_temp: float | None
    current_humidity: float | None
    last_reading_at: UtcDatetime | None
    in_range: bool | None = None
    unit_count: int = 0


class FacilityOut(ORM):
    id: int
    code: str
    name: str
    location: str
    contact: str


class FacilityDetail(FacilityOut):
    zones: list[ZoneOut]
    available_units: int
    open_alerts: int
    status: Literal["OK", "WARNING", "CRITICAL"]


class ReadingOut(ORM):
    id: int
    zone_id: int
    temperature: float
    humidity: float
    in_range: bool
    recorded_at: UtcDatetime


# ---------- Inventory ----------
class BloodUnitCreate(BaseModel):
    unit_code: str | None = Field(None, description="Leave empty to auto-generate")
    blood_group: BloodGroup
    component: Component
    volume_ml: int = Field(gt=0, le=600)
    collected_on: date
    expires_on: date | None = Field(None, description="Leave empty to use the component's shelf life")
    facility_id: int


class BloodUnitStatusUpdate(BaseModel):
    status: UnitStatus


class BloodUnitTransfer(BaseModel):
    facility_id: int


class BloodUnitOut(ORM):
    id: int
    unit_code: str
    blood_group: str
    component: str
    component_name: str = ""
    volume_ml: int
    collected_on: date
    expires_on: date
    days_to_expiry: int = 0
    status: str
    facility_id: int
    facility_name: str = ""
    zone_id: int
    zone_name: str = ""
    created_at: UtcDatetime


# ---------- Availability ----------
class FacilityAvailability(BaseModel):
    facility_id: int
    facility_name: str
    location: str
    contact: str
    total_units: int
    by_group: dict[str, int]
    earliest_expiry: date | None
    units: list[BloodUnitOut]


class AvailabilityResult(BaseModel):
    recipient_group: str
    component: str
    component_name: str
    include_compatible: bool
    donor_groups_searched: list[str]
    total_units: int
    facilities: list[FacilityAvailability]


# ---------- Alerts ----------
class AlertOut(ORM):
    id: int
    alert_type: str
    severity: str
    message: str
    facility_id: int | None
    facility_name: str | None = None
    zone_id: int | None
    unit_id: int | None
    created_at: UtcDatetime
    acknowledged: bool
    acknowledged_by: str | None
    acknowledged_at: UtcDatetime | None
    resolved: bool
    resolved_at: UtcDatetime | None


class AlertAck(BaseModel):
    acknowledged_by: str = Field("Demo User", min_length=1, max_length=60)


# ---------- Simulation ----------
class FaultRequest(BaseModel):
    mode: Literal["NONE", "HIGH", "LOW"]
