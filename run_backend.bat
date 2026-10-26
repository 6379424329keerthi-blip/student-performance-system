@echo off
echo ======================================================================
echo Starting FastAPI Backend (Port 8000)...
echo ======================================================================
cd /d "%~dp0"
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
pause
