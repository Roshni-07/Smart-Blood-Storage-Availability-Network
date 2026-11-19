"""Convert ORM rows into API response objects (adds computed fields)."""
from datetime import date

from ..constants import COMPONENTS
from ..models import Alert, BloodUnit, StorageZone
from ..schemas import AlertOut, BloodUnitOut, ZoneOut


def unit_out(unit: BloodUnit, today: date | None = None) -> BloodUnitOut:
    today = today or date.today()
    out = BloodUnitOut.model_validate(unit)
    out.component_name = COMPONENTS[unit.component]["name"]
    out.days_to_expiry = (unit.expires_on - today).days
    out.facility_name = unit.facility.name
    out.zone_name = unit.zone.name
    return out


def zone_out(zone: StorageZone, unit_count: int = 0) -> ZoneOut:
    out = ZoneOut.model_validate(zone)
    if zone.current_temp is not None:
        out.in_range = zone.min_temp <= zone.current_temp <= zone.max_temp
    out.unit_count = unit_count
    return out


def alert_out(alert: Alert) -> AlertOut:
    out = AlertOut.model_validate(alert)
    out.facility_name = alert.facility.name if alert.facility else None
    return out
