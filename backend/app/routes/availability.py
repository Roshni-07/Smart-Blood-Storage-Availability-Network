"""Cross-facility availability search."""
from collections import Counter
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..constants import BLOOD_GROUPS, COMPONENTS, compatible_donor_groups
from ..database import get_db
from ..models import BloodUnit, Facility
from ..schemas import AvailabilityResult, BloodGroup, Component, FacilityAvailability
from ..services.serializers import unit_out

router = APIRouter(prefix="/api", tags=["availability"])


@router.get("/availability", response_model=AvailabilityResult)
def search_availability(
    blood_group: BloodGroup = Query(..., description="Recipient (patient) blood group"),
    component: Component = Query("RBC"),
    include_compatible: bool = Query(True, description="Also include compatible donor groups"),
    min_units: int = Query(1, ge=1, description="Only list facilities with at least this many units"),
    db: Session = Depends(get_db),
):
    """Find AVAILABLE units across all facilities.

    Facilities are ranked by how many matching units they have; within each
    facility units are listed soonest-expiry first (first-expiry-first-out),
    and exact blood-group matches are listed before compatible substitutes.
    """
    donor_groups = compatible_donor_groups(blood_group, component) if include_compatible else [blood_group]
    today = date.today()

    units = db.scalars(
        select(BloodUnit)
        .options(joinedload(BloodUnit.facility), joinedload(BloodUnit.zone))
        .where(
            BloodUnit.status == "AVAILABLE",
            BloodUnit.component == component,
            BloodUnit.blood_group.in_(donor_groups),
            BloodUnit.expires_on >= today,
        )
    ).all()

    facilities = {f.id: f for f in db.scalars(select(Facility)).all()}
    by_facility: dict[int, list[BloodUnit]] = {}
    for u in units:
        by_facility.setdefault(u.facility_id, []).append(u)

    results = []
    for fid, items in by_facility.items():
        if len(items) < min_units:
            continue
        items.sort(key=lambda u: (u.blood_group != blood_group, u.expires_on))
        f = facilities[fid]
        counts = Counter(u.blood_group for u in items)
        results.append(FacilityAvailability(
            facility_id=f.id, facility_name=f.name, location=f.location, contact=f.contact,
            total_units=len(items),
            by_group={g: counts[g] for g in BLOOD_GROUPS if counts.get(g)},
            earliest_expiry=min(u.expires_on for u in items),
            units=[unit_out(u, today) for u in items],
        ))
    results.sort(key=lambda r: -r.total_units)

    return AvailabilityResult(
        recipient_group=blood_group, component=component,
        component_name=COMPONENTS[component]["name"],
        include_compatible=include_compatible, donor_groups_searched=donor_groups,
        total_units=sum(r.total_units for r in results), facilities=results,
    )
