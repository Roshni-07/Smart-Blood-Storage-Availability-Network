@echo off
REM Review-day mode: builds the frontend once, then serves EVERYTHING from
REM http://localhost:8000 with a single window (no dev server needed).
cd /d "%~dp0frontend"
echo Building frontend...
call npm run build || goto :error
cd /d "%~dp0backend"
start "" /b cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:8000"
venv\Scripts\python -m uvicorn app.main:app --port 8000
pause
exit /b 0
:error
echo Build failed - read the message above.
pause
exit /b 1
