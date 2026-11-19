"""Demo controls for the simulated sensors.

These endpoints exist only because the hardware is simulated. They let the
presenter trigger a temperature excursion on demand during a review.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import Base, SessionLocal, engine, get_db
from ..models import StorageZone
from ..schemas import FaultRequest
from ..services import sensor_simulator
from ..services.seed import seed_if_empty
from ..services.serializers import zone_out

router = APIRouter(prefix="/api/simulation", tags=["simulation"])


@router.get("/status")
def status():
    return {"interval_seconds": sensor_simulator.SIM_INTERVAL_SECONDS,
            "ticks_since_start": sensor_simulator._tick_count}


@router.post("/zones/{zone_id}/fault")
def set_fault(zone_id: int, data: FaultRequest, db: Session = Depends(get_db)):
    """mode=HIGH -> zone warms up, LOW -> cools down, NONE -> recovers to normal."""
    zone = db.get(StorageZone, zone_id)
    if not zone:
        raise HTTPException(404, "Zone not found")
    zone.fault_mode = data.mode
    db.commit()
    return zone_out(zone)


@router.post("/tick")
def tick(steps: int = 1):
    """Advance the simulation immediately (instead of waiting 5 s per step)."""
    steps = max(1, min(steps, 20))
    for i in range(steps):
        sensor_simulator.run_tick(force_inventory_check=(i == steps - 1))
    return {"ticks": steps}


@router.post("/reset")
def reset():
    """Delete all data and re-create the original demo data."""
    with sensor_simulator._lock:
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        db = SessionLocal()
        try:
            seed_if_empty(db)
        finally:
            db.close()
    return {"reset": True}
