@echo off
REM One-time setup: Python virtual environment + backend packages + frontend packages.
cd /d "%~dp0backend"
echo [1/3] Creating Python virtual environment...
python -m venv venv || goto :error
echo [2/3] Installing backend packages...
venv\Scripts\python -m pip install --upgrade pip >nul
venv\Scripts\python -m pip install -r requirements.txt -r requirements-dev.txt || goto :error
cd /d "%~dp0frontend"
echo [3/3] Installing frontend packages (this can take a minute)...
call npm install || goto :error
echo.
echo Setup complete. Now run start-backend.bat and start-frontend.bat
pause
exit /b 0
:error
echo.
echo Setup FAILED - read the message above.
pause
exit /b 1
