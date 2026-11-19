@echo off
REM Runs the automated end-to-end backend tests (uses a temporary database)
cd /d "%~dp0backend"
venv\Scripts\python -m pytest -v
pause
