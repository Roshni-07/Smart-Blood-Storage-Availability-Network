"""Alerts: list and acknowledge."""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import Alert, utcnow
from ..schemas import AlertAck, AlertOut
from ..services.serializers import alert_out

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

SEVERITY_ORDER = {"CRITICAL": 0, "WARNING": 1, "INFO": 2}


@router.get("", response_model=list[AlertOut])
def list_alerts(
    view: Literal["unacknowledged", "active", "all"] = Query(
        "unacknowledged",
        description="unacknowledged = not yet acknowledged; active = condition not yet resolved; all = history",
    ),
    severity: str | None = None,
    facility_id: int | None = None,
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    q = select(Alert).options(joinedload(Alert.facility))
    if view == "unacknowledged":
        q = q.where(Alert.acknowledged.is_(False))
    elif view == "active":
        q = q.where(Alert.resolved.is_(False))
    if severity:
        q = q.where(Alert.severity == severity)
    if facility_id:
        q = q.where(Alert.facility_id == facility_id)
    alerts = db.scalars(q.order_by(Alert.created_at.desc()).limit(limit)).all()
    if view != "all":  # most urgent first, then newest
        alerts = sorted(alerts, key=lambda a: (SEVERITY_ORDER.get(a.severity, 9), -a.created_at.timestamp()))
    return [alert_out(a) for a in alerts]


@router.post("/{alert_id}/acknowledge", response_model=AlertOut)
def acknowledge(alert_id: int, data: AlertAck | None = None, db: Session = Depends(get_db)):
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(404, "Alert not found")
    if not alert.acknowledged:
        alert.acknowledged = True
        alert.acknowledged_by = (data or AlertAck()).acknowledged_by
        alert.acknowledged_at = utcnow()
        db.commit()
        db.refresh(alert)
    return alert_out(alert)
