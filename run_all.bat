@echo off
echo ======================================================================
echo Starting Smart Student Performance Prediction System (Full-Stack)
echo ======================================================================
cd /d "%~dp0"

start "FastAPI Backend (Port 8000)" cmd /k "python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul

start "React Vite Dashboard (Port 5173)" cmd /k "cd frontend && npm run dev"
timeout /t 2 /nobreak >nul

echo ======================================================================
echo System successfully launched!
echo Backend Swagger API: http://localhost:8000/docs
echo Frontend Dashboard:  http://localhost:5173
echo ======================================================================
