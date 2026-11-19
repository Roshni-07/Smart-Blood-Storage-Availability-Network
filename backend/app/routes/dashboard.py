"""One call that gives the dashboard everything it needs."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from ..constants import (
    BLOOD_GROUPS, COMPONENTS, EXPIRY_WARNING_DAYS, LOW_STOCK_THRESHOLD, PLATELET_EXPIRY_WARNING_DAYS,
)
from ..database import get_db
from ..models import Alert, BloodUnit
from ..services.serializers import alert_out
from .facilities import build_facility_details

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    today = date.today()
    facilities = build_facility_details(db)

    rows = db.execute(
        select(BloodUnit.blood_group, BloodUnit.component, func.count())
        .where(BloodUnit.status == "AVAILABLE")
        .group_by(BloodUnit.blood_group, BloodUnit.component)
    ).all()
    stock = {g: {c: 0 for c in COMPONENTS} for g in BLOOD_GROUPS}
    for g, c, n in rows:
        stock[g][c] = n

    status_counts = dict(db.execute(
        select(BloodUnit.status, func.count()).group_by(BloodUnit.status)
    ).all())

    # same rule as the alert engine (platelets use a shorter warning window)
    expiring_soon = sum(
        1 for comp, exp in db.execute(
            select(BloodUnit.component, BloodUnit.expires_on).where(
                BloodUnit.status == "AVAILABLE",
                BloodUnit.expires_on <= today + timedelta(days=EXPIRY_WARNING_DAYS),
            )
        ).all()
        if (exp - today).days <= (PLATELET_EXPIRY_WARNING_DAYS if comp == "PLT" else EXPIRY_WARNING_DAYS)
    )

    unack = dict(db.execute(
        select(Alert.severity, func.count()).where(Alert.acknowledged.is_(False)).group_by(Alert.severity)
    ).all())
    recent = db.scalars(
        select(Alert).options(joinedload(Alert.facility))
        .where(Alert.acknowledged.is_(False))
        .order_by(Alert.created_at.desc()).limit(6)
    ).all()

    zones = [z for f in facilities for z in f.zones]
    return {
        "generated_at": today.isoformat(),
        "totals": {
            "facilities": len(facilities),
            "storage_zones": len(zones),
            "zones_out_of_range": sum(1 for z in zones if z.in_range is False),
            "available_units": status_counts.get("AVAILABLE", 0),
            "reserved_units": status_counts.get("RESERVED", 0),
            "expiring_soon": expiring_soon,
            "unacknowledged_alerts": sum(unack.values()),
            "critical_alerts": unack.get("CRITICAL", 0),
        },
        "low_stock_threshold": LOW_STOCK_THRESHOLD,
        "stock_by_group": [
            {"blood_group": g, **stock[g], "total": sum(stock[g].values())} for g in BLOOD_GROUPS
        ],
        "facilities": [f.model_dump(mode="json") for f in facilities],
        "recent_alerts": [alert_out(a).model_dump(mode="json") for a in recent],
    }
