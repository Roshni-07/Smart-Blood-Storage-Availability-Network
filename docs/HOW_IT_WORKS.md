# How it works – architecture, rules and design decisions

Use this document to explain the system at a review or viva, and to split the work in the team.

## 1. Architecture: a modular monolith

```
 Browser (React pages)
      │  every 5 s: GET /api/...        actions: POST / PATCH
      ▼
 FastAPI backend ───────────────────────────────────────────────
 │ routes/      dashboard · facilities · inventory · availability · alerts · simulation
 │ services/    sensor_simulator ──► alert_engine ◄── inventory changes
 │              (background task, every 5 s)
 └─────────────────────────────┬────────────────────────────────
                               ▼
                 SQLite: blood_network.db (one shared database)
```

One app, one backend, one database, with separate modules for each job. There are no
"fake" screens: every page reads the same tables through the same API, so a unit
registered in Inventory shows up immediately in Availability and on the Dashboard.

## 2. Build order used

1. **Domain rules** (`constants.py`): blood groups, components, storage ranges, shelf lives,
   donor compatibility.
2. **Database schema** (`models.py`): 5 tables.
3. **API contract** (`schemas.py`): the exact JSON shapes the frontend depends on.
4. **Alert engine**, then the **sensor simulator** that feeds it.
5. **Seed data**, so the app is never empty.
6. **API routes**, each tested with curl and `/docs` before any UI existed.
7. **Frontend**: shared UI pieces → the 5 pages → live polling.
8. **End-to-end tests** (`tests/test_demo_workflow.py`) + a headless-browser run of the demo.

## 3. Data model

| Table | Key fields | Notes |
|-------|-----------|-------|
| `facilities` | code, name, location, contact | 3 seeded (Jayanagar, Hebbal, Whitefield) |
| `storage_zones` | facility_id, zone_type, min/max temp, setpoint, current_temp, fault_mode | 3 per facility: refrigerator, platelet incubator, plasma freezer |
| `sensor_readings` | zone_id, temperature, humidity, in_range, recorded_at | One per zone every 5 s; trimmed after 6 h |
| `blood_units` | unit_code, blood_group, component, volume_ml, collected_on, expires_on, status, facility_id, zone_id | Status: AVAILABLE → RESERVED → ISSUED, or EXPIRED / DISCARDED |
| `alerts` | alert_type, severity, message, dedupe_key, acknowledged(+by/at), resolved(+at) | Linked to a facility/zone/unit where relevant |

Times are stored in UTC and sent with a `Z` suffix, so the browser shows them in IST.

## 4. Storage rules (prototype reference values)

| Component | Code | Storage | Shelf life used |
|-----------|------|---------|-----------------|
| Whole Blood (CPDA-1 assumed) | WB | 2–6 °C refrigerator | 35 days; CPD is max 21 days |
| Packed Red Cells (additive solution assumed) | RBC | 2–6 °C refrigerator | Up to 42 days with specified additive solutions; CPDA-1 max 35 days; open-system processing 24 h |
| Platelets | PLT | 20–24 °C (22 ± 2 °C) with continuous gentle agitation | 3 or 5 days according to bag manufacturer/regulator; demo default 5 days |
| Fresh Frozen Plasma (frozen) | FFP | −30 °C or colder (demo alarm envelope −80 to −30 °C) | Up to 12 months |
| Thawed Plasma | TFP | 2–6 °C refrigerator | Up to 24 hours |

**Scientific basis (India):** National Standards for Blood Centres & Blood Transfusion Services, 2nd ed. (2022), clauses 8.16.3–8.16.5 and 8.18.1–8.18.5. These specify refrigerator 4 ± 2 °C; CPD whole blood up to 21 days and CPDA-1 up to 35 days; red-cell additive solutions up to 42 days; platelets at 22 ± 2 °C with continuous agitation and 3/5 days according to bag/manufacturer; FFP and cryoprecipitate at −30 °C or below for up to 12 months. Clause 8.10.5.2 specifies thawed FFP use within 6 h at room temperature or up to 24 h refrigerated at 4 °C.

Source: https://clinicalestablishments.mohfw.gov.in/sites/default/files/2023-03/1491_0.pdf

The defaults are tied to the preparation assumptions shown in parentheses. The application does not capture all processing details (e.g. anticoagulant/additive solution, open vs closed processing, or platelet bag manufacturer); therefore the auto-calculated expiry is a demonstration default, not an authoritative expiry for an individual unit. Actual expiry must follow the component label, approved blood-centre SOP and applicable regulations. Thawed plasma is represented separately from frozen FFP. Platelet agitation is a required storage condition but is not measured by this temperature-only simulator.

## 5. Sensor simulator (`services/sensor_simulator.py`)

* Runs as a background task started with the server, ticking every **5 seconds**.
* **Normal:** each reading moves 35% of the way back to the setpoint, plus random noise
  (±0.15 °C fridge, ±0.6 °C freezer), so it wobbles realistically.
* **Fault HIGH / LOW** (set from the UI): temperature drifts about 1 °C per reading
  (3 °C for freezers) until "Restore normal", then recovers gradually.
* Each reading goes straight to the alert engine.
* `POST /api/simulation/tick` advances immediately, which is handy during a demo.

## 6. Alert engine (`services/alert_engine.py`)

| Rule | Type | Severity | Trigger |
|------|------|----------|---------|
| 1 | TEMP_HIGH / TEMP_LOW | CRITICAL | Reading outside the zone's min–max |
| 2 | EXPIRED | WARNING | Available/reserved unit is past expiry. The unit is also auto-marked EXPIRED |
| 3 | EXPIRING_SOON | INFO | Unit expires within 3 days (1 day for platelets) |
| 4 | LOW_STOCK | WARNING | Network-wide available red cells of a group < 3 |

**No alert spam:** each alert has a `dedupe_key` (e.g. `TEMP_HIGH:zone:1`). While an
alert with that key is still open, the same condition does not create another one.
A fridge that stays warm for 10 minutes raises **one** alert, not 120.

**Acknowledged vs resolved:**
* *Acknowledged* means a person has taken responsibility (they press the button).
* *Resolved* means the condition has cleared (set automatically by the engine).

A temperature excursion that fixed itself still needs acknowledging, because someone
must decide whether the stored blood is still usable.

## 7. Availability search (`routes/availability.py`)

* Input: patient blood group, component, and whether to include compatible groups.
* **Red cells / whole blood** use ABO + Rh red-cell compatibility (O- is the universal donor).
* **Plasma / platelets** use reversed ABO plasma compatibility (AB is the universal donor).
* Results are grouped by facility and ranked by unit count. Within a facility, exact
  group matches come first, then the soonest expiry (first-expiry-first-out).
* This is simplified. Real issue always needs cross-matching.

## 8. API reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/dashboard` | Totals, facility status, stock by group, latest alerts |
| GET | `/api/facilities` | Facilities with zones, current readings, status |
| GET | `/api/readings?limit=60` | Last N readings per zone (for charts) |
| GET | `/api/meta` | Dropdown lists + allowed status changes |
| GET | `/api/inventory?facility_id=&blood_group=&component=&status=&search=` | List units |
| POST | `/api/inventory` | Register a unit (code and expiry auto-filled if blank) |
| PATCH | `/api/inventory/{id}/status` | Reserve / issue / discard / release |
| POST | `/api/inventory/{id}/transfer` | Move a unit to another facility |
| GET | `/api/availability?blood_group=&component=&include_compatible=` | Cross-facility search |
| GET | `/api/alerts?view=unacknowledged\|active\|all` | List alerts |
| POST | `/api/alerts/{id}/acknowledge` | Acknowledge (body: `acknowledged_by`) |
| POST | `/api/simulation/zones/{id}/fault` | `{"mode": "HIGH" \| "LOW" \| "NONE"}` |
| POST | `/api/simulation/tick?steps=1` | Advance the simulator now |
| POST | `/api/simulation/reset` | Wipe and re-seed demo data |

Full interactive docs: http://localhost:8000/docs

## 9. Frontend design

* `services/api.js` is the only file that knows endpoint URLs.
* `hooks/usePolling.js` refreshes data every 5 s, matching the simulator, so no page needs a
  manual reload.
* The Vite dev server proxies `/api` to port 8000. In `start-demo.bat` mode, FastAPI serves
  the built frontend itself.
* Every screen shows loading, error ("backend offline") and empty states.

## 10. Suggested team split (4 people)

| Owner | Files | First tasks |
|-------|-------|-------------|
| Backend / data model | `models.py`, `schemas.py`, `routes/inventory.py`, `routes/availability.py` | Present the schema and API; add audit log of status changes |
| Sensor simulation & alerts | `services/sensor_simulator.py`, `services/alert_engine.py` | Explain the rules; add door-open / power-fail sensors |
| Frontend | `frontend/src/**` | Present the UI; add a facility detail page |
| Testing / integration / demo | `tests/`, `.bat` scripts, README | Run the demo script, extend tests, prepare slides |

Rules: change `schemas.py` only after telling the frontend owner (it is the contract);
keep one shared database; run `run-tests.bat` before pushing.

## 11. Possible next steps

* Login and roles (technician, pharmacist, admin)
* Audit trail for every unit status change and acknowledgement
* Real sensors (ESP32 + DS18B20, posting to an `/api/readings` ingest endpoint)
* Notifications (SMS/email) for critical alerts
* Blood requests between hospitals with approval workflow
