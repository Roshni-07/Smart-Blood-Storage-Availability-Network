@echo off
REM Starts the React dev server on http://localhost:5173 (backend must be running)
cd /d "%~dp0frontend"
call npm run dev -- --open
pause
