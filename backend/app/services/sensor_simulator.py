"""Simulated storage sensors.

Every SIM_INTERVAL_SECONDS the simulator produces one temperature + humidity
reading for every storage zone, saves it, and passes it to the alert engine.

How a reading is generated
--------------------------
* Normal mode : temperature drifts back toward the zone's setpoint with a
                little random noise, so it wobbles realistically inside range.
* HIGH fault  : temperature climbs by `drift` °C per tick (door left open,
                compressor failure, power cut...).
* LOW fault   : temperature drops by `drift` °C per tick (thermostat failure).
When a fault is cleared the temperature recovers gradually, and the alert
engine automatically marks the alert as resolved once it is back in range.
"""
import asyncio
import logging
import random
import threading
from datetime import timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, joinedload

from ..database import SessionLocal
from ..models import SensorReading, StorageZone, utcnow
from . import alert_engine

log = logging.getLogger("simulator")

SIM_INTERVAL_SECONDS = 5
INVENTORY_CHECK_EVERY_N_TICKS = 12      # about once a minute
READING_RETENTION = timedelta(hours=6)  # keep the DB small

# Per zone type: random noise and how fast a fault moves the temperature
ZONE_BEHAVIOUR = {
    "REFRIGERATOR":       {"noise": 0.15, "drift": 1.0, "limit": 15.0},
    "PLATELET_INCUBATOR": {"noise": 0.20, "drift": 0.9, "limit": 15.0},
    "PLASMA_FREEZER":     {"noise": 0.60, "drift": 3.0, "limit": 25.0},
}

_lock = threading.Lock()  # one tick at a time (background loop vs manual tick)
_tick_count = 0


def next_temperature(zone: StorageZone, rng: random.Random = random) -> float:
    b = ZONE_BEHAVIOUR[zone.zone_type]
    current = zone.current_temp if zone.current_temp is not None else zone.setpoint

    if zone.fault_mode == "HIGH":
        temp = current + b["drift"] + rng.gauss(0, b["noise"])
        temp = min(temp, zone.setpoint + b["limit"])
    elif zone.fault_mode == "LOW":
        temp = current - b["drift"] + rng.gauss(0, b["noise"])
        temp = max(temp, zone.setpoint - b["limit"])
    else:
        # pull 35% of the way back to setpoint, plus noise
        temp = current + (zone.setpoint - current) * 0.35 + rng.gauss(0, b["noise"])
    return round(temp, 2)


def next_humidity(zone: StorageZone, rng: random.Random = random) -> float:
    current = zone.current_humidity if zone.current_humidity is not None else 45.0
    return round(min(70.0, max(30.0, current + (45.0 - current) * 0.3 + rng.gauss(0, 1.0))), 1)


def record_reading(db: Session, zone: StorageZone, temperature: float, humidity: float, at=None) -> SensorReading:
    at = at or utcnow()
    in_range = alert_engine.check_zone_reading(db, zone, temperature)
    reading = SensorReading(zone_id=zone.id, temperature=temperature, humidity=humidity,
                            in_range=in_range, recorded_at=at)
    db.add(reading)
    zone.current_temp = temperature
    zone.current_humidity = humidity
    zone.last_reading_at = at
    return reading


def run_tick(force_inventory_check: bool = False) -> int:
    """Generate one reading per zone. Returns the number of readings created."""
    global _tick_count
    with _lock:
        db = SessionLocal()
        try:
            zones = db.scalars(select(StorageZone).options(joinedload(StorageZone.facility))).all()
            for zone in zones:
                record_reading(db, zone, next_temperature(zone), next_humidity(zone))

            _tick_count += 1
            if force_inventory_check or _tick_count % INVENTORY_CHECK_EVERY_N_TICKS == 0:
                alert_engine.check_inventory(db)
                db.execute(delete(SensorReading).where(SensorReading.recorded_at < utcnow() - READING_RETENTION))
            db.commit()
            return len(zones)
        except Exception:
            db.rollback()
            log.exception("Simulator tick failed")
            raise
        finally:
            db.close()


async def simulation_loop(stop: asyncio.Event) -> None:
    """Background task started by main.py when the server starts."""
    log.info("Sensor simulator started (every %ss)", SIM_INTERVAL_SECONDS)
    while not stop.is_set():
        try:
            await asyncio.to_thread(run_tick)
        except Exception:
            pass  # already logged; keep the simulator alive
        try:
            await asyncio.wait_for(stop.wait(), timeout=SIM_INTERVAL_SECONDS)
        except asyncio.TimeoutError:
            pass
    log.info("Sensor simulator stopped")
