import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    API_TITLE: str = "Smart Student Performance Prediction API"
    API_VERSION: str = "1.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    MODELS_DIR: str = os.path.join(BASE_DIR, "models")
    DATA_DIR: str = os.path.join(BASE_DIR, "data", "processed")
    RESULTS_DIR: str = os.path.join(BASE_DIR, "reports", "results")
    DB_PATH: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "database", "database.sqlite")

settings = Settings()
