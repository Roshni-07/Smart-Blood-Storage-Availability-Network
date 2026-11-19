"""Smart Blood Storage & Availability Network — backend entry point.

Run (from the backend folder, with the venv active):
    uvicorn app.main:app --reload --port 8000
Interactive API docs: http://localhost:8000/docs
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .database import Base, SessionLocal, engine
from .routes import alerts, availability, dashboard, facilities, inventory, simulation
from .services import alert_engine
from .services.seed import seed_if_empty
from .services.sensor_simulator import simulation_loop

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s: %(message)s")
log = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create tables  2. Seed demo data on first run  3. Run inventory rules
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        if seed_if_empty(db):
            log.info("Seeded demo data (3 facilities)")
        alert_engine.check_inventory(db)
        db.commit()
    finally:
        db.close()

    # 4. Start the sensor simulator in the background
    stop = asyncio.Event()
    task = asyncio.create_task(simulation_loop(stop))
    yield
    stop.set()
    await task


app = FastAPI(
    title="Smart Blood Storage & Availability Network",
    description="Prototype with SIMULATED storage facilities and sensors. "
                "Not a validated medical device or certified blood-bank system.",
    version="0.1.0",
    lifespan=lifespan,
)

# Allow the Vite dev server (port 5173) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (dashboard, facilities, inventory, availability, alerts, simulation):
    app.include_router(r.router)


@app.get("/api/health", tags=["system"])
def health():
    return {"status": "ok"}


# If the frontend has been built (npm run build), serve it from here too, so
# the whole app runs from one address: http://localhost:8000
FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if FRONTEND_DIST.exists():
    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith("api/"):
            from fastapi import HTTPException
            raise HTTPException(404, "Not found")
        file = (FRONTEND_DIST / path).resolve()
        if path and file.is_file() and FRONTEND_DIST in file.parents:
            return FileResponse(file)
        return FileResponse(FRONTEND_DIST / "index.html")
