"""Facilities, storage zones and sensor readings."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Alert, BloodUnit, Facility, SensorReading, StorageZone
from ..schemas import FacilityDetail, ReadingOut
from ..services.serializers import zone_out

router = APIRouter(prefix="/api", tags=["facilities"])


def build_facility_details(db: Session) -> list[FacilityDetail]:
    facilities = db.scalars(
        select(Facility).options(selectinload(Facility.zones)).order_by(Facility.id)
    ).all()

    units_per_zone = dict(db.execute(
        select(BloodUnit.zone_id, func.count())
        .where(BloodUnit.status == "AVAILABLE").group_by(BloodUnit.zone_id)
    ).all())
    open_alerts = db.execute(
        select(Alert.facility_id, Alert.severity, func.count())
        .where(Alert.resolved.is_(False), Alert.facility_id.is_not(None))
        .group_by(Alert.facility_id, Alert.severity)
    ).all()

    result = []
    for f in facilities:
        sev = {s: n for fid, s, n in open_alerts if fid == f.id}
        zones = [zone_out(z, units_per_zone.get(z.id, 0)) for z in sorted(f.zones, key=lambda z: z.id)]
        if sev.get("CRITICAL") or any(z.in_range is False for z in zones):
            status = "CRITICAL"
        elif sev.get("WARNING"):
            status = "WARNING"
        else:
            status = "OK"
        result.append(FacilityDetail(
            id=f.id, code=f.code, name=f.name, location=f.location, contact=f.contact,
            zones=zones, available_units=sum(z.unit_count for z in zones),
            open_alerts=sum(sev.values()), status=status,
        ))
    return result


@router.get("/facilities", response_model=list[FacilityDetail])
def list_facilities(db: Session = Depends(get_db)):
    return build_facility_details(db)


@router.get("/facilities/{facility_id}", response_model=FacilityDetail)
def get_facility(facility_id: int, db: Session = Depends(get_db)):
    for f in build_facility_details(db):
        if f.id == facility_id:
            return f
    raise HTTPException(404, "Facility not found")


@router.get("/readings", response_model=dict[int, list[ReadingOut]])
def recent_readings(
    limit: int = Query(60, ge=1, le=720, description="Readings per zone (newest N)"),
    facility_id: int | None = None,
    db: Session = Depends(get_db),
):
    """Latest `limit` readings for every zone, oldest first (ready for charting)."""
    zone_q = select(StorageZone.id)
    if facility_id:
        zone_q = zone_q.where(StorageZone.facility_id == facility_id)
    out: dict[int, list[ReadingOut]] = {}
    for zone_id in db.scalars(zone_q).all():
        rows = db.scalars(
            select(SensorReading).where(SensorReading.zone_id == zone_id)
            .order_by(SensorReading.recorded_at.desc()).limit(limit)
        ).all()
        out[zone_id] = [ReadingOut.model_validate(r) for r in reversed(rows)]
    return out
