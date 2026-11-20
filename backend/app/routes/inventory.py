"""Blood unit inventory: register, list, change status, transfer."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from ..constants import BLOOD_GROUPS, COMPONENTS, UNIT_STATUSES, ZONE_TYPES
from ..database import get_db
from ..models import BloodUnit, Facility, StorageZone
from ..schemas import BloodUnitCreate, BloodUnitOut, BloodUnitStatusUpdate, BloodUnitTransfer
from ..services import alert_engine
from ..services.seed import make_unit_code
from ..services.serializers import unit_out

router = APIRouter(prefix="/api", tags=["inventory"])

# Which status changes are allowed (simple workflow guard)
ALLOWED_TRANSITIONS = {
    "AVAILABLE": {"RESERVED", "ISSUED", "DISCARDED"},
    "RESERVED": {"AVAILABLE", "ISSUED", "DISCARDED"},
    "ISSUED": set(),
    "EXPIRED": {"DISCARDED"},
    "DISCARDED": set(),
}


def _zone_for(db: Session, facility_id: int, component: str) -> StorageZone:
    for zone in db.scalars(select(StorageZone).where(StorageZone.facility_id == facility_id)):
        if component in ZONE_TYPES[zone.zone_type]["components"]:
            return zone
    raise HTTPException(400, f"Facility has no storage zone for component {component}")


def _get_unit(db: Session, unit_id: int) -> BloodUnit:
    unit = db.get(BloodUnit, unit_id)
    if not unit:
        raise HTTPException(404, "Blood unit not found")
    return unit


@router.get("/meta")
def meta():
    """Reference lists for dropdowns in the frontend."""
    return {
        "blood_groups": BLOOD_GROUPS,
        "components": [{"code": c, **v} for c, v in COMPONENTS.items()],
        "statuses": UNIT_STATUSES,
        "transitions": {k: sorted(v) for k, v in ALLOWED_TRANSITIONS.items()},
    }


@router.get("/inventory", response_model=list[BloodUnitOut])
def list_units(
    facility_id: int | None = None,
    blood_group: str | None = None,
    component: str | None = None,
    status: str | None = Query(None, description="AVAILABLE, RESERVED, ISSUED, EXPIRED, DISCARDED"),
    search: str | None = Query(None, description="Matches unit code"),
    db: Session = Depends(get_db),
):
    q = select(BloodUnit).options(joinedload(BloodUnit.facility), joinedload(BloodUnit.zone))
    if facility_id:
        q = q.where(BloodUnit.facility_id == facility_id)
    if blood_group:
        q = q.where(BloodUnit.blood_group == blood_group)
    if component:
        q = q.where(BloodUnit.component == component)
    if status:
        q = q.where(BloodUnit.status == status)
    if search:
        q = q.where(or_(BloodUnit.unit_code.ilike(f"%{search}%")))
    q = q.order_by(BloodUnit.expires_on, BloodUnit.id)  # first-expiry-first-out
    today = date.today()
    return [unit_out(u, today) for u in db.scalars(q).all()]


@router.post("/inventory", response_model=BloodUnitOut, status_code=201)
def register_unit(data: BloodUnitCreate, db: Session = Depends(get_db)):
    facility = db.get(Facility, data.facility_id)
    if not facility:
        raise HTTPException(404, "Facility not found")
    today = date.today()
    if data.collected_on > today:
        raise HTTPException(400, "Collection date cannot be in the future")

    if data.component == "TFP" and data.expires_on is None:
        raise HTTPException(400, "Thawed plasma expiry must be entered from its thawing time (use within 24 hours)")
    shelf_life_days = COMPONENTS[data.component]["shelf_life_days"]
    expires_on = data.expires_on or data.collected_on + timedelta(days=shelf_life_days)
    if expires_on <= data.collected_on:
        raise HTTPException(400, "Expiry date must be after the collection date")
    if expires_on < today:
        raise HTTPException(400, "This unit is already expired and cannot be registered as available")

    unit_code = (data.unit_code or "").strip().upper()
    if unit_code:
        if db.scalar(select(BloodUnit.id).where(BloodUnit.unit_code == unit_code)):
            raise HTTPException(409, f"Unit code {unit_code} already exists")
    else:
        next_seq = (db.scalar(select(func.max(BloodUnit.id))) or 0) + 1
        unit_code = make_unit_code(facility.code, data.collected_on, next_seq)
        while db.scalar(select(BloodUnit.id).where(BloodUnit.unit_code == unit_code)):
            next_seq += 1
            unit_code = make_unit_code(facility.code, data.collected_on, next_seq)

    unit = BloodUnit(
        unit_code=unit_code, blood_group=data.blood_group, component=data.component,
        volume_ml=data.volume_ml, collected_on=data.collected_on, expires_on=expires_on,
        status="AVAILABLE", facility_id=facility.id,
        zone_id=_zone_for(db, facility.id, data.component).id,
    )
    db.add(unit)
    db.flush()
    alert_engine.check_inventory(db, today)
    db.commit()
    db.refresh(unit)
    return unit_out(unit, today)


@router.patch("/inventory/{unit_id}/status", response_model=BloodUnitOut)
def update_status(unit_id: int, data: BloodUnitStatusUpdate, db: Session = Depends(get_db)):
    unit = _get_unit(db, unit_id)
    if data.status != unit.status and data.status not in ALLOWED_TRANSITIONS[unit.status]:
        raise HTTPException(400, f"Cannot change a {unit.status} unit to {data.status}")
    if data.status in ("AVAILABLE", "RESERVED") and unit.expires_on < date.today():
        raise HTTPException(400, "Unit is past its expiry date")
    unit.status = data.status
    alert_engine.check_inventory(db)
    db.commit()
    db.refresh(unit)
    return unit_out(unit)


@router.post("/inventory/{unit_id}/transfer", response_model=BloodUnitOut)
def transfer_unit(unit_id: int, data: BloodUnitTransfer, db: Session = Depends(get_db)):
    """Move an available/reserved unit to another facility (inter-facility transfer)."""
    unit = _get_unit(db, unit_id)
    if unit.status not in ("AVAILABLE", "RESERVED"):
        raise HTTPException(400, f"Only available or reserved units can be transferred (unit is {unit.status})")
    if not db.get(Facility, data.facility_id):
        raise HTTPException(404, "Destination facility not found")
    if data.facility_id == unit.facility_id:
        raise HTTPException(400, "Unit is already at that facility")
    unit.facility_id = data.facility_id
    unit.zone_id = _zone_for(db, data.facility_id, unit.component).id
    db.commit()
    db.refresh(unit)
    return unit_out(unit)
