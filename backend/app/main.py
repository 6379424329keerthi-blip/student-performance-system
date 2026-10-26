import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from backend.app.core.config import settings
from backend.app.database.db import init_db
from backend.app.services.ml_service import ml_service

from backend.app.api.health import router as health_router
from backend.app.api.overview import router as overview_router
from backend.app.api.dataset import router as dataset_router
from backend.app.api.analytics import router as analytics_router
from backend.app.api.models import router as models_router
from backend.app.api.predict import router as predict_router
from backend.app.api.predictions import router as predictions_router
from backend.app.api.reports import router as reports_router
from backend.app.api.college_students import router as college_students_router
from backend.app.api.college_datasets import router as college_datasets_router
from backend.app.api.college_analytics import router as college_analytics_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle startup and shutdown handler."""
    print("=" * 60)
    print(f"[*] Starting {settings.API_TITLE} ({settings.API_VERSION})")
    print("=" * 60)
    init_db()
    print("[+] Database initialized.")
    if not ml_service.is_loaded:
        ml_service.load_models()
    print("[+] Machine learning models and explainers ready.")
    yield
    print("[*] Shutting down application cleanly.")

app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description="Intelligent academic analytics and early-warning risk prediction system using verified Machine Learning pipelines (Random Forest & Gradient Boosting).",
    lifespan=lifespan
)

# CORS Middleware: configured for both local development and GitHub Pages cloud hosting
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(health_router, prefix="/api", tags=["System Health"])
app.include_router(overview_router, prefix="/api", tags=["Dashboard Overview"])
app.include_router(dataset_router, prefix="/api", tags=["Dataset Explorer"])
app.include_router(analytics_router, prefix="/api", tags=["Academic Analytics"])
app.include_router(models_router, prefix="/api", tags=["Model Registry & Evaluation"])
app.include_router(predict_router, prefix="/api", tags=["Inference & Prediction"])
app.include_router(predictions_router, prefix="/api", tags=["Prediction History"])
app.include_router(reports_router, prefix="/api", tags=["Academic Reports"])
app.include_router(college_students_router, prefix="/api/college", tags=["College Students"])
app.include_router(college_datasets_router, prefix="/api/college", tags=["College Datasets"])
app.include_router(college_analytics_router, prefix="/api/college", tags=["College Analytics"])

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
