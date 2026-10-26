import time
import os
import psutil
from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.services.ml_service import ml_service
from backend.app.database.db import get_db_connection

router = APIRouter()
START_TIME = time.time()

@router.get("/health")
def get_health():
    """System health check endpoint."""
    uptime_seconds = round(time.time() - START_TIME, 1)
    
    # Check DB
    db_ok = False
    try:
        with get_db_connection() as conn:
            conn.execute("SELECT 1").fetchone()
        db_ok = True
    except Exception as e:
        print(f"[!] DB health check error: {e}")
        
    return {
        "status": "healthy" if (ml_service.is_loaded and db_ok) else "degraded",
        "api_title": settings.API_TITLE,
        "version": settings.API_VERSION,
        "environment": settings.ENVIRONMENT,
        "uptime_seconds": uptime_seconds,
        "model_status": {
            "loaded": ml_service.is_loaded,
            "classifier": ml_service.metadata["selected_classifier"]["name"] if ml_service.metadata else None,
            "regressor": ml_service.metadata["selected_regressor"]["name"] if ml_service.metadata else None
        },
        "database_status": {
            "connected": db_ok,
            "type": "SQLite"
        }
    }
