"""Rule-based alert engine.

Rules
-----
1. TEMP_HIGH / TEMP_LOW   (CRITICAL)  a zone reading is outside its allowed range
2. EXPIRED                (WARNING)   an available/reserved unit passed its expiry
                                      date -> unit is automatically marked EXPIRED
3. EXPIRING_SOON          (INFO)      an available unit expires within N days
4. LOW_STOCK              (WARNING)   network-wide available red cells for a blood
                                      group fall below LOW_STOCK_THRESHOLD

Lifecycle
---------
* Each alert has a `dedupe_key` (e.g. "TEMP_HIGH:zone:4"). While an alert with
  that key is still open (not resolved), the same condition will not create a
  duplicate — so a fridge that stays warm raises ONE alert, not one every 5 s.
* acknowledged = a person has seen it and taken responsibility.
* resolved     = the condition itself has cleared (set automatically).
  A new alert is raised if the condition happens again later.
"""
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..constants import (
    BLOOD_GROUPS,
    COMPONENTS,
    EXPIRY_WARNING_DAYS,
    LOW_STOCK_THRESHOLD,
    PLATELET_EXPIRY_WARNING_DAYS,
)
from ..models import Alert, BloodUnit, StorageZone, utcnow


# ---------------------------------------------------------------- helpers
def _open_alert(db: Session, key: str) -> Alert | None:
    return db.scalar(select(Alert).where(Alert.dedupe_key == key, Alert.resolved.is_(False)))


def raise_alert(db: Session, *, key: str, alert_type: str, severity: str, message: str,
                facility_id=None, zone_id=None, unit_id=None,
                refresh_message: bool = False) -> Alert | None:
    """Create an alert unless an open one with the same key already exists.

    refresh_message=True updates the text of the existing open alert instead
    (used for stock counts, which change while the alert stays open).
    """
    existing = _open_alert(db, key)
    if existing:
        if refresh_message:
            existing.message = message
        return None
    alert = Alert(
        dedupe_key=key, alert_type=alert_type, severity=severity, message=message,
        facility_id=facility_id, zone_id=zone_id, unit_id=unit_id,
    )
    db.add(alert)
    return alert


def resolve_alert(db: Session, key: str) -> None:
    """Mark the open alert for `key` as resolved (condition has cleared)."""
    alert = _open_alert(db, key)
    if alert:
        alert.resolved = True
        alert.resolved_at = utcnow()


# ----------------------------------------------------------- rule 1: temperature
def check_zone_reading(db: Session, zone: StorageZone, temperature: float) -> bool:
    """Evaluate one sensor reading. Returns True if the reading is in range."""
    high_key = f"TEMP_HIGH:zone:{zone.id}"
    low_key = f"TEMP_LOW:zone:{zone.id}"
    where = f"{zone.name} at {zone.facility.name}"

    if temperature > zone.max_temp:
        resolve_alert(db, low_key)
        raise_alert(
            db, key=high_key, alert_type="TEMP_HIGH", severity="CRITICAL",
            message=(f"{where} is too warm: {temperature:.1f} °C "
                     f"(allowed {zone.min_temp:g} to {zone.max_temp:g} °C)."),
            facility_id=zone.facility_id, zone_id=zone.id,
        )
        return False
    if temperature < zone.min_temp:
        resolve_alert(db, high_key)
        raise_alert(
            db, key=low_key, alert_type="TEMP_LOW", severity="CRITICAL",
            message=(f"{where} is too cold: {temperature:.1f} °C "
                     f"(allowed {zone.min_temp:g} to {zone.max_temp:g} °C)."),
            facility_id=zone.facility_id, zone_id=zone.id,
        )
        return False

    resolve_alert(db, high_key)
    resolve_alert(db, low_key)
    return True


# ------------------------------------------------- rules 2-4: inventory checks
def check_inventory(db: Session, today: date | None = None) -> None:
    today = today or date.today()

    # Rule 2: auto-expire units past their expiry date
    expired_units = db.scalars(
        select(BloodUnit).where(
            BloodUnit.status.in_(["AVAILABLE", "RESERVED"]),
            BloodUnit.expires_on < today,
        )
    ).all()
    for unit in expired_units:
        unit.status = "EXPIRED"
        resolve_alert(db, f"EXPIRING_SOON:unit:{unit.id}")
        raise_alert(
            db, key=f"EXPIRED:unit:{unit.id}", alert_type="EXPIRED", severity="WARNING",
            message=(f"Unit {unit.unit_code} ({unit.blood_group} "
                     f"{COMPONENTS[unit.component]['name']}) expired on "
                     f"{unit.expires_on:%d %b %Y} and was removed from available stock."),
            facility_id=unit.facility_id, zone_id=unit.zone_id, unit_id=unit.id,
        )

    db.flush()  # make the status changes above visible to the queries below

    # Rule 3: expiring soon
    available = db.scalars(select(BloodUnit).where(BloodUnit.status == "AVAILABLE")).all()
    for unit in available:
        warn_days = PLATELET_EXPIRY_WARNING_DAYS if unit.component == "PLT" else EXPIRY_WARNING_DAYS
        key = f"EXPIRING_SOON:unit:{unit.id}"
        days_left = (unit.expires_on - today).days
        if days_left <= warn_days:
            when = "today" if days_left == 0 else f"in {days_left} day{'s' if days_left != 1 else ''}"
            raise_alert(
                db, key=key, alert_type="EXPIRING_SOON", severity="INFO",
                message=(f"Unit {unit.unit_code} ({unit.blood_group} "
                         f"{COMPONENTS[unit.component]['name']}) at {unit.facility.name} "
                         f"expires {when} — use first."),
                facility_id=unit.facility_id, zone_id=unit.zone_id, unit_id=unit.id,
            )
        else:
            resolve_alert(db, key)

    # Units that left stock (issued/discarded) no longer need an expiry warning
    gone = db.scalars(select(BloodUnit.id).where(BloodUnit.status.in_(["ISSUED", "DISCARDED"]))).all()
    for unit_id in gone:
        resolve_alert(db, f"EXPIRING_SOON:unit:{unit_id}")

    # Rule 4: network-wide low stock of red cells
    counts = dict(
        db.execute(
            select(BloodUnit.blood_group, func.count())
            .where(BloodUnit.status == "AVAILABLE", BloodUnit.component == "RBC")
            .group_by(BloodUnit.blood_group)
        ).all()
    )
    for group in BLOOD_GROUPS:
        key = f"LOW_STOCK:RBC:{group}"
        n = counts.get(group, 0)
        if n < LOW_STOCK_THRESHOLD:
            raise_alert(
                db, key=key, alert_type="LOW_STOCK", severity="WARNING",
                message=(f"Low network stock: only {n} unit{'s' if n != 1 else ''} of "
                         f"{group} Packed Red Cells available across all facilities "
                         f"(threshold {LOW_STOCK_THRESHOLD})."),
                refresh_message=True,
            )
        else:
            resolve_alert(db, key)

