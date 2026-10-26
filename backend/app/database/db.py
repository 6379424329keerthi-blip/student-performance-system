import os
import sqlite3
import json
from contextlib import contextmanager
from backend.app.core.config import settings

def get_db_path():
    db_dir = os.path.dirname(settings.DB_PATH)
    os.makedirs(db_dir, exist_ok=True)
    return settings.DB_PATH

@contextmanager
def get_db_connection():
    """Context manager for SQLite database connections."""
    conn = sqlite3.connect(get_db_path(), timeout=10.0)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """Initialize SQLite database tables."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Predictions table (Benchmark / ad-hoc inference)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_identifier TEXT NOT NULL,
                course TEXT NOT NULL,
                input_features TEXT NOT NULL,
                predicted_at_risk INTEGER NOT NULL,
                risk_probability REAL NOT NULL,
                predicted_grade REAL NOT NULL,
                risk_tier TEXT NOT NULL,
                confidence_level TEXT NOT NULL,
                explanation TEXT NOT NULL,
                recommendations TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Datasets table (Separation of Benchmark and College cohorts)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS datasets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                department TEXT DEFAULT 'All Departments',
                semester TEXT DEFAULT 'Semester 1',
                academic_year TEXT DEFAULT '2024-2025',
                is_system_benchmark INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # College / Institution Students table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS institution_students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dataset_id INTEGER NOT NULL,
                student_id TEXT NOT NULL,
                student_name TEXT NOT NULL,
                email TEXT,
                department TEXT NOT NULL,
                course_name TEXT NOT NULL,
                semester TEXT NOT NULL,
                academic_year TEXT DEFAULT '2024-2025',
                attendance_percentage REAL NOT NULL,
                previous_score REAL NOT NULL,
                max_previous_score REAL NOT NULL DEFAULT 100.0,
                internal_marks REAL NOT NULL,
                max_internal_marks REAL NOT NULL DEFAULT 25.0,
                assignment_marks REAL NOT NULL,
                max_assignment_marks REAL NOT NULL DEFAULT 25.0,
                study_hours_per_week REAL NOT NULL DEFAULT 5.0,
                failures INTEGER NOT NULL DEFAULT 0,
                observed_final_score REAL,
                observed_at_risk INTEGER,
                additional_attributes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
                UNIQUE (dataset_id, student_id)
            );
        """)

        # Dataset Imports log table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dataset_imports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dataset_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                total_rows INTEGER NOT NULL,
                imported_rows INTEGER NOT NULL,
                skipped_rows INTEGER NOT NULL,
                error_log TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
            );
        """)

        # Institution Student Predictions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS institution_predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_pk INTEGER NOT NULL,
                dataset_id INTEGER NOT NULL,
                student_id TEXT NOT NULL,
                predicted_at_risk INTEGER NOT NULL,
                predicted_outcome TEXT NOT NULL,
                risk_probability REAL NOT NULL,
                predicted_grade REAL NOT NULL,
                risk_tier TEXT NOT NULL,
                confidence_percentage REAL NOT NULL,
                confidence_level TEXT NOT NULL,
                shap_factors TEXT NOT NULL,
                recommendations TEXT NOT NULL,
                model_version TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_pk) REFERENCES institution_students(id) ON DELETE CASCADE,
                FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
            );
        """)

        # Seed default college dataset if none exist
        cursor.execute("SELECT COUNT(*) as cnt FROM datasets WHERE is_system_benchmark = 0")
        if cursor.fetchone()["cnt"] == 0:
            cursor.execute("""
                INSERT INTO datasets (name, description, department, semester, academic_year, is_system_benchmark)
                VALUES ('My College Cohort', 'Primary institutional college cohort dataset', 'Computer Science & Engineering', 'Semester 5', '2024-2025', 0)
            """)

        
        # Model Registry table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS model_registry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_name TEXT NOT NULL,
                architecture TEXT NOT NULL,
                version TEXT NOT NULL,
                metrics TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Sync model metadata from file if registry is empty
        cursor.execute("SELECT COUNT(*) as cnt FROM model_registry")
        row = cursor.fetchone()
        if row["cnt"] == 0:
            meta_path = os.path.join(settings.MODELS_DIR, "model_metadata.json")
            if os.path.exists(meta_path):
                try:
                    with open(meta_path, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                    cursor.execute("""
                        INSERT INTO model_registry (model_name, architecture, version, metrics, is_active)
                        VALUES (?, ?, ?, ?, 1)
                    """, (
                        meta["selected_classifier"]["name"],
                        meta["selected_classifier"]["architecture"],
                        "v1.0.0",
                        json.dumps(meta["selected_classifier"]["test_performance"])
                    ))
                except Exception as e:
                    print(f"[!] Note on model registry init: {e}")

# Automatically ensure DB tables exist upon module load
init_db()
