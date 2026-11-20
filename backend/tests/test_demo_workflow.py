"""Automated check of the review-day demonstration workflow.

Run from the backend folder:   python -m pytest -q
Uses its own temporary database, so your demo data is never touched.
"""
import os
import tempfile
from datetime import date

os.environ["BLOOD_DB_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.constants import compatible_donor_groups  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:  # runs startup: create tables + seed
        c.post("/api/simulation/reset")
        yield c


def test_1_dashboard_shows_three_facilities(client):
    d = client.get("/api/dashboard").json()
    assert d["totals"]["facilities"] == 3
    assert d["totals"]["storage_zones"] == 9
    assert d["totals"]["available_units"] > 50


def test_2_monitoring_has_readings_for_every_zone(client):
    readings = client.get("/api/readings", params={"limit": 10}).json()
    assert len(readings) == 9
    assert all(len(r) == 10 for r in readings.values())


def test_3_4_fault_raises_critical_alert_which_can_be_acknowledged(client):
    zone_id = client.get("/api/facilities").json()[0]["zones"][0]["id"]  # a refrigerator
    client.post(f"/api/simulation/zones/{zone_id}/fault", json={"mode": "HIGH"})
    client.post("/api/simulation/tick", params={"steps": 6})

    critical = [a for a in client.get("/api/alerts", params={"view": "active"}).json()
                if a["alert_type"] == "TEMP_HIGH" and a["zone_id"] == zone_id]
    assert len(critical) == 1, "exactly one alert, not one per reading"
    alert = critical[0]
    assert alert["severity"] == "CRITICAL"

    acked = client.post(f"/api/alerts/{alert['id']}/acknowledge", json={"acknowledged_by": "Tester"}).json()
    assert acked["acknowledged"] and acked["acknowledged_by"] == "Tester"

    # recovery -> alert resolves automatically
    client.post(f"/api/simulation/zones/{zone_id}/fault", json={"mode": "NONE"})
    client.post("/api/simulation/tick", params={"steps": 15})
    history = client.get("/api/alerts", params={"view": "all"}).json()
    assert next(a for a in history if a["id"] == alert["id"])["resolved"] is True


def test_5_inventory_register_and_status_workflow(client):
    facility_id = client.get("/api/facilities").json()[1]["id"]
    today = date.today().isoformat()
    r = client.post("/api/inventory", json={
        "blood_group": "AB-", "component": "RBC", "volume_ml": 300,
        "collected_on": today, "facility_id": facility_id})
    assert r.status_code == 201
    unit = r.json()
    assert unit["zone_name"] == "Blood Bank Refrigerator"
    assert unit["days_to_expiry"] == 42
    assert client.patch(f"/api/inventory/{unit['id']}/status", json={"status": "ISSUED"}).status_code == 200
    bad = client.patch(f"/api/inventory/{unit['id']}/status", json={"status": "AVAILABLE"})
    assert bad.status_code == 400

    assert client.post("/api/inventory", json={
        "blood_group": "Z+", "component": "RBC", "volume_ml": 300,
        "collected_on": today, "facility_id": facility_id}).status_code == 422


def test_6_availability_search_across_facilities(client):
    exact = client.get("/api/availability", params={"blood_group": "O+", "include_compatible": False}).json()
    compat = client.get("/api/availability", params={"blood_group": "O+"}).json()
    assert compat["total_units"] >= exact["total_units"] > 0
    assert set(compat["donor_groups_searched"]) == {"O-", "O+"}
    for f in compat["facilities"]:
        assert all(u["status"] == "AVAILABLE" and u["component"] == "RBC" for u in f["units"])


def test_compatibility_rules():
    assert compatible_donor_groups("AB+", "RBC") == ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
    assert compatible_donor_groups("O-", "RBC") == ["O-"]
    assert set(compatible_donor_groups("O+", "FFP")) == {"O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"}
    assert set(compatible_donor_groups("AB-", "FFP")) == {"AB-", "AB+"}


def test_thawed_plasma_metadata_is_refrigerated_and_one_day(client):
    meta = client.get("/api/meta").json()
    thawed = next(c for c in meta["components"] if c["code"] == "TFP")
    assert thawed["min_temp"] == 2.0
    assert thawed["max_temp"] == 6.0
    assert thawed["shelf_life_days"] is None


def test_thawed_plasma_requires_explicit_expiry_date(client):
    from datetime import timedelta
    facility_id = client.get("/api/facilities").json()[0]["id"]
    today = date.today()
    missing_expiry = client.post("/api/inventory", json={
        "blood_group": "AB+", "component": "TFP", "volume_ml": 250,
        "collected_on": today.isoformat(), "facility_id": facility_id,
    })
    assert missing_expiry.status_code == 400
    with_expiry = client.post("/api/inventory", json={
        "blood_group": "AB+", "component": "TFP", "volume_ml": 250,
        "collected_on": today.isoformat(), "expires_on": (today + timedelta(days=1)).isoformat(),
        "facility_id": facility_id,
    })
    assert with_expiry.status_code == 201
    assert with_expiry.json()["zone_name"] == "Blood Bank Refrigerator"
