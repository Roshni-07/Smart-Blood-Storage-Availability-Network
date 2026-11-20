# Smart Blood Storage & Availability Network

A locally runnable prototype that monitors **simulated** blood storage facilities,
tracks blood units, searches availability across facilities and raises rule-based alerts.

> **Prototype only.** Facilities and sensor readings are simulated. Storage rules are demonstration defaults tied to stated preparation assumptions; they are not a substitute for labelled expiry dates or blood-centre SOPs. This is a software
> demonstration, not a validated medical device or certified blood-bank system, and it
> does not control real storage equipment.

| Layer    | Technology |
|----------|------------|
| Backend  | Python 3.11+, FastAPI, SQLAlchemy 2, SQLite |
| Frontend | React 19 + Vite, Tailwind CSS 4, Recharts, Axios, Lucide icons, React Router |

---

## 1. Prerequisites (Windows 11)

Check in PowerShell:

```powershell
python --version   # 3.11 or newer
node --version     # 20.19+ or 22.12+  (Vite 8 needs this; install Node 22 LTS if older)
npm --version
git --version
```

## 2. Quick start (double-click)

1. **`setup.bat`** – one time only. Creates the Python venv and installs all packages.
2. **`start-backend.bat`** – API + sensor simulator on http://localhost:8000
3. **`start-frontend.bat`** – web app on http://localhost:5173 (opens your browser)

Keep both windows open while you work.

**Review day:** use **`start-demo.bat`** instead of steps 2–3. It builds the frontend and serves
the whole app from http://localhost:8000 in one window.

The `.bat` files call the venv's Python directly, so the PowerShell
"execution policy" problem with `Activate.ps1` never comes up.

## 3. Manual setup (same thing, typed)

```powershell
# Terminal 1 – backend
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 – frontend
cd frontend
npm install
npm run dev
```

* Web app: http://localhost:5173
* Interactive API docs (try every endpoint): http://localhost:8000/docs

On first start the backend creates `backend/blood_network.db` and fills it with demo data:
3 facilities in Bengaluru, 9 storage zones, about 106 blood units and 1 hour of sensor history.

## 4. Demonstration script (matches the project plan)

| Step | Where | What to do / say |
|------|-------|------------------|
| 1 | **Dashboard** | Three facilities with live zone temperatures, stock by blood group, alerts waiting. |
| 2 | **Storage Monitoring** | Every zone updates every 5 s. The green band is the allowed range. |
| 3 | **Storage Monitoring** | Press **Warm up** on City Central's refrigerator. About 1 °C per reading; it crosses 6 °C in ~15 s (press *Advance simulation* to go faster). |
| 4 | **Alerts** | A **CRITICAL – Temperature too high** alert appears (sidebar badge turns red). Press **Acknowledge**. Back on Monitoring, press **Restore normal**: the alert becomes *Resolved* by itself. |
| 5 | **Inventory** | Units across all facilities, soonest expiry first. **Register unit** to add one, then Reserve / Issue / Transfer it. |
| 6 | **Availability Search** | Pick patient group **AB-**, Packed Red Cells. Results are ranked by facility, and compatible groups (O-, A-, B-) are included. |

Extra talking points: the expired unit was removed from stock automatically, low-stock alerts
for the rare negative groups, and the "expiring soon" warnings.

**Reset the demo data:** `POST /api/simulation/reset` from http://localhost:8000/docs,
or stop the backend and delete `backend/blood_network.db`.

## 5. Tests

```powershell
run-tests.bat            # or: cd backend; .\venv\Scripts\python -m pytest -v
```

The tests walk through the same 6 demo steps against a temporary database.

## 6. Project structure

```
smart-blood-network/
├── backend/
│   ├── app/
│   │   ├── main.py              # app start-up, routers, background simulator
│   │   ├── database.py          # SQLite engine + session
│   │   ├── models.py            # tables: Facility, StorageZone, SensorReading, BloodUnit, Alert
│   │   ├── schemas.py           # API request/response shapes (the API contract)
│   │   ├── constants.py         # blood groups, components, storage ranges, compatibility
│   │   ├── routes/              # dashboard, facilities, inventory, availability, alerts, simulation
│   │   └── services/
│   │       ├── sensor_simulator.py
│   │       ├── alert_engine.py
│   │       ├── seed.py          # demo data
│   │       └── serializers.py
│   ├── tests/test_demo_workflow.py
│   ├── requirements.txt
│   └── requirements-dev.txt
├── frontend/
│   ├── src/
│   │   ├── pages/               # Dashboard, StorageMonitoring, Inventory, Availability, Alerts
│   │   ├── components/          # Layout (sidebar), ui.jsx (shared pieces), StockChart
│   │   ├── services/api.js      # every backend call in one place
│   │   ├── hooks/usePolling.js  # auto-refresh every 5 s
│   │   └── utils/format.js
│   ├── vite.config.js           # /api proxied to the backend
│   └── package.json
├── docs/HOW_IT_WORKS.md         # architecture, rules, API reference, design decisions
├── setup.bat / start-*.bat / run-tests.bat
└── README.md
```

## 7. Troubleshooting

| Problem | Fix |
|---------|-----|
| Web app shows "Cannot reach the backend" | Start `start-backend.bat` first; check http://localhost:8000/api/health |
| `npm run dev` says Node version is too old | Install Node.js 22 LTS from nodejs.org, reopen the terminal |
| `Activate.ps1 cannot be loaded` | Use the `.bat` files, or `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Port 8000 already in use | Close the other backend window, or change `--port` in the .bat and `vite.config.js` |
| Want a clean demo | Delete `backend/blood_network.db` and restart the backend |
