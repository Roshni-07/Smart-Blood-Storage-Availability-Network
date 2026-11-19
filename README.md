# 🩸 Smart Blood Storage & Availability Network

### Monitor storage. Track inventory. Connect availability.

A software prototype that brings blood storage monitoring, inventory management, and cross-facility availability into one unified platform.

**Smart Blood Storage & Availability Network** demonstrates how multiple blood storage facilities can be monitored through simulated sensor data, how inventory can be tracked across locations, and how rule-based alerts can help identify storage conditions that need attention.

> **Note:** This is an academic software prototype. All facilities, sensor readings, and inventory records are simulated. It is not a validated medical device, certified blood-bank management system, or clinical decision-making tool. It does not control real storage equipment or authorize blood release.

---

## ✨ What does it do?

The platform brings together three important workflows:

| Capability | What it offers |
|---|---|
| 🌡️ Storage Monitoring | Monitor temperature readings across multiple storage zones and compare them against configurable limits. |
| 🩸 Inventory Management | Register, track, reserve, issue, and transfer blood units across facilities. |
| 🔎 Availability Search | Search blood component availability across multiple facilities using blood-group compatibility demonstration rules. |
| 🚨 Rule-Based Alerts | Detect temperature deviations, low stock, and approaching expiry through automated rules. |
| 📊 Central Dashboard | View facility status, storage conditions, stock distribution, and outstanding alerts. |

## 🚀 The platform in action

### 01 — Monitor storage conditions

Monitor simulated sensor readings across three facilities and nine storage zones.

- Automatic sensor updates every five seconds.
- Temperature history visualized through interactive charts.
- Configurable acceptable storage ranges.
- Visual indication of normal and out-of-range conditions.

### 02 — Detect and respond to alerts

The rule-based alert engine evaluates incoming readings and inventory conditions.

- Critical alerts for temperature deviations.
- Low-stock warnings for selected blood groups.
- Expiry-related notifications.
- Alert acknowledgement and resolution tracking.

### 03 — Manage blood inventory

Maintain a centralized view of blood units across participating facilities.

- Register new blood units.
- Track blood group, component, volume, collection date, and expiry date.
- Reserve, issue, and transfer inventory.
- Monitor inventory status and expiry timelines.

### 04 — Search availability across facilities

Search for available blood components across all participating facilities.

- Search using recipient blood group and component.
- Demonstrate compatibility-based donor-group filtering.
- View availability across multiple facilities.
- Prioritize results by facility availability.

*Compatibility results are illustrative software rules, not clinical transfusion authorization.*

---

## 🧪 Try the live simulation

The following workflow demonstrates the complete monitoring-to-alert lifecycle.

| Step | Action | Expected result |
|---|---|---|
| 01 | Open Dashboard | View facility status, stock distribution, and alerts. |
| 02 | Open Storage Monitoring | Observe simulated temperature readings and history. |
| 03 | Select **Warm up** on City Central's refrigerator | Temperature gradually increases and crosses its configured upper limit. |
| 04 | Open Alerts | A critical temperature alert appears. |
| 05 | Select **Acknowledge** | The alert records acknowledgement. |
| 06 | Return to Monitoring and select **Restore normal** | The temperature returns towards its normal range and the alert can be automatically resolved. |
| 07 | Open Inventory | Register a new unit and explore reservation, issue, and transfer actions. |
| 08 | Open Availability Search | Search for AB- Packed Red Cells and inspect compatible demonstration results. |

**Additional scenarios:** Explore expired-stock exclusion, low-stock alerts for rare negative groups, and upcoming-expiry warnings.

---

## 🏗️ System architecture

The application follows a straightforward frontend–backend architecture.

```text
                 ┌──────────────────────────────┐
                 │       React Frontend         │
                 │                              │
                 │ Dashboard | Monitoring       │
                 │ Inventory | Availability    │
                 │ Alerts                     │
                 └──────────────┬───────────────┘
                                │
                         REST API / JSON
                                │
                 ┌──────────────▼───────────────┐
                 │       FastAPI Backend        │
                 │                              │
                 │ Facility Management          │
                 │ Inventory Management         │
                 │ Availability Search          │
                 │ Sensor Simulation            │
                 │ Rule-Based Alert Engine      │
                 └──────────────┬───────────────┘
                                │
                 ┌──────────────▼───────────────┐
                 │          SQLite              │
                 │                              │
                 │ Facilities | Storage Zones   │
                 │ Sensor Readings | Blood Units│
                 │ Alerts                       │
                 └──────────────────────────────┘
```

The frontend communicates with the backend through REST APIs. The backend manages application logic, simulated sensor readings, inventory operations, and alert generation. SQLite stores the prototype's application data.

### Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4 |
| Visualization | Recharts |
| Navigation & Icons | React Router, Lucide React |
| API Communication | Axios |
| Backend | Python 3.11+, FastAPI |
| Database | SQLite, SQLAlchemy 2 |
| Validation | Pydantic |
| Testing | Pytest |

---

## ⚙️ Get started locally

### Prerequisites

Install the following on Windows 11:

- Python 3.11 or newer
- Node.js 20.19+ or 22.12+
- npm
- Git

Verify your installations:

```powershell
python --version
node --version
npm --version
git --version
```

### Option A — Quick start

The project includes Windows batch scripts to simplify setup.

**First-time setup**

```text
setup.bat
```

**Start the application**

Open two terminals and run:

```text
start-backend.bat
```

```text
start-frontend.bat
```

Keep both terminals running.

| Service | Address |
|---|---|
| Web application | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Interactive API documentation | http://localhost:8000/docs |

### Option B — Single-window demonstration

For a review or demonstration, use:

```text
start-demo.bat
```

This builds the frontend and serves the complete application through the backend at:

**http://localhost:8000**

### Manual installation

**Backend**

```powershell
cd backend

python -m venv venv
.\venv\Scripts\Activate.ps1

pip install -r requirements.txt -r requirements-dev.txt

uvicorn app.main:app --reload --port 8000
```

**Frontend** — open another terminal:

```powershell
cd frontend

npm install
npm run dev
```

---

## 🗂️ Project structure

```text
smart-blood-network/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── constants.py
│   │   ├── routes/
│   │   └── services/
│   │       ├── sensor_simulator.py
│   │       ├── alert_engine.py
│   │       ├── seed.py
│   │       └── serializers.py
│   │
│   ├── tests/
│   │   └── test_demo_workflow.py
│   ├── requirements.txt
│   └── requirements-dev.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── utils/
│   ├── public/
│   └── package.json
│
├── docs/
│   └── HOW_IT_WORKS.md
│
├── setup.bat
├── start-backend.bat
├── start-frontend.bat
├── start-demo.bat
├── run-tests.bat
└── README.md
```

---

## 🧫 Running tests

Run the included demonstration workflow tests:

```powershell
run-tests.bat
```

Or execute them directly:

```powershell
cd backend
.\venv\Scripts\python -m pytest -v
```

The tests exercise the six core demonstration workflows against a temporary database.

---

## 🔄 Resetting demonstration data

To restore the initial demo state, use the simulation reset endpoint:

```text
POST /api/simulation/reset
```

Available through the interactive API documentation at:

http://localhost:8000/docs

Alternatively, stop the backend and delete:

```text
backend/blood_network.db
```

The database is recreated and seeded when the backend starts.

The initial dataset includes:

- 3 simulated facilities in Bengaluru
- 9 storage zones
- Approximately 106 blood units
- One hour of simulated sensor history

---

## 🔮 Future scope

The prototype establishes a software foundation that can be extended with:

- Physical sensor integration using devices such as ESP32.
- Real-time monitoring from connected storage equipment.
- Expanded facility connectivity and inventory synchronization.
- More comprehensive monitoring and operational analytics.

These are potential extensions, not currently implemented capabilities.

---

## 📌 Project status

**Academic prototype — locally runnable demonstration**

Built to demonstrate how storage monitoring, inventory tracking, availability discovery, and rule-based alerts can work together in a multi-facility software platform.

