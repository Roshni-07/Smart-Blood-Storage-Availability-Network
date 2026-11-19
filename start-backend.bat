@echo off
REM Starts the FastAPI backend + sensor simulator on http://localhost:8000
cd /d "%~dp0backend"
venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
pause
