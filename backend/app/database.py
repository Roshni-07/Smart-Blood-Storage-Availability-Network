"""Database setup: one SQLite file shared by every module.

Every part of the app (simulator, alert engine, inventory, availability,
dashboard) reads and writes through this same engine, which is the
"single source of truth" rule from the project plan.
"""
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# BLOOD_DB_PATH lets the automated tests use a throw-away database file
DB_PATH = Path(os.environ.get("BLOOD_DB_PATH", Path(__file__).resolve().parent.parent / "blood_network.db"))
DATABASE_URL = f"sqlite:///{DB_PATH}"

# check_same_thread=False lets the background simulator thread and the
# API request threads share the SQLite connection pool safely.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False, "timeout": 15})
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency: opens a session per request and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
