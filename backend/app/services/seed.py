"""Demo data: three simulated facilities, their storage zones, ~1 hour of
sensor history and a realistic spread of blood units.

Runs automatically the first time the backend starts (empty database).
To start fresh, stop the server and delete backend/blood_network.db,
or call POST /api/simulation/reset.
"""
import random
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..constants import COMPONENTS, ZONE_TYPES
from ..models import BloodUnit, Facility, StorageZone, utcnow
from . import alert_engine
from .sensor_simulator import SIM_INTERVAL_SECONDS, next_humidity, next_temperature, record_reading

FACILITIES = [
    {"code": "CBC", "name": "City Central Blood Centre", "location": "Jayanagar, Bengaluru",
     "contact": "080-0000-1001 (demo)"},
    {"code": "NHB", "name": "North Hospital Blood Bank", "location": "Hebbal, Bengaluru",
     "contact": "080-0000-2002 (demo)"},
    {"code": "ESH", "name": "East Community Storage Hub", "location": "Whitefield, Bengaluru",
     "contact": "080-0000-3003 (demo)"},
]

# Rough blood-group mix for an Indian donor population (sums to 100).
GROUP_WEIGHTS = {"O+": 36, "B+": 31, "A+": 21, "AB+": 6, "O-": 2, "B-": 2, "A-": 1, "AB-": 1}

# How many units of each component per facility
STOCK_PLAN = {"CBC": {"RBC": 26, "WB": 4, "PLT": 6, "FFP": 12},
              "NHB": {"RBC": 18, "WB": 3, "PLT": 4, "FFP": 8},
              "ESH": {"RBC": 12, "WB": 2, "PLT": 3, "FFP": 6}}

VOLUME = {"WB": (450, 450), "RBC": (280, 350), "PLT": (50, 70), "FFP": (200, 250)}
HISTORY_POINTS = 60  # pre-filled readings per zone so charts are not empty


def make_unit_code(facility_code: str, collected_on: date, seq: int) -> str:
    return f"{facility_code}-{collected_on:%y%m%d}-{seq:04d}"


def seed_if_empty(db: Session) -> bool:
    if db.scalar(select(Facility.id).limit(1)) is not None:
        return False

    rng = random.Random(42)  # fixed seed -> same demo data every time
    today = date.today()
    now = utcnow()

    seq = 0
    for f in FACILITIES:
        facility = Facility(**f)
        db.add(facility)
        db.flush()

        zones = {}
        for zone_type, z in ZONE_TYPES.items():
            zone = StorageZone(
                facility_id=facility.id, name=z["label"], zone_type=zone_type,
                min_temp=z["min_temp"], max_temp=z["max_temp"], setpoint=z["setpoint"],
                current_temp=z["setpoint"], current_humidity=45.0,
            )
            db.add(zone)
            zones[zone_type] = zone
        db.flush()

        # Sensor history: last HISTORY_POINTS readings, oldest first
        for zone in zones.values():
            zone.facility = facility
            for i in range(HISTORY_POINTS, 0, -1):
                at = now - timedelta(seconds=SIM_INTERVAL_SECONDS * i)
                record_reading(db, zone, next_temperature(zone, rng), next_humidity(zone, rng), at=at)

        # Blood units
        groups, weights = zip(*GROUP_WEIGHTS.items())
        for component, count in STOCK_PLAN[f["code"]].items():
            shelf = COMPONENTS[component]["shelf_life_days"]
            zone = next(z for z in zones.values() if component in ZONE_TYPES[z.zone_type]["components"])
            for _ in range(count):
                seq += 1
                group = rng.choices(groups, weights)[0]
                # keep random stock clear of the expiry-warning window;
                # the "specials" below create the expiring examples on purpose
                age = rng.randint(0, 2) if component == "PLT" else rng.randint(0, shelf - 5)
                collected = today - timedelta(days=age)
                db.add(BloodUnit(
                    unit_code=make_unit_code(f["code"], collected, seq),
                    blood_group=group, component=component,
                    volume_ml=rng.randint(*VOLUME[component]),
                    collected_on=collected, expires_on=collected + timedelta(days=shelf),
                    status="AVAILABLE", facility_id=facility.id, zone_id=zone.id,
                ))

        # Guaranteed demo cases at the first facility
        if f["code"] == "CBC":
            fridge = zones["REFRIGERATOR"]
            specials = [
                ("O-", 41),  # expires tomorrow  -> EXPIRING_SOON alert
                ("A+", 40),  # expires in 2 days -> EXPIRING_SOON alert
                ("B+", 43),  # expired yesterday, still "available" -> auto-EXPIRED
            ]
            for group, age in specials:
                seq += 1
                collected = today - timedelta(days=age)
                db.add(BloodUnit(
                    unit_code=make_unit_code("CBC", collected, seq), blood_group=group,
                    component="RBC", volume_ml=300, collected_on=collected,
                    expires_on=collected + timedelta(days=42), status="AVAILABLE",
                    facility_id=facility.id, zone_id=fridge.id,
                ))

    db.flush()
    alert_engine.check_inventory(db, today)
    db.commit()
    return True
