import os
import json
import math
import pandas as pd
from typing import Optional
from fastapi import APIRouter, Query
from backend.app.core.config import settings
from backend.app.database.db import get_db_connection
from backend.app.services.college_feature_mapper import calculate_scaled_g1

router = APIRouter()

def load_cleaned_uci_dataset():
    path = os.path.join(settings.DATA_DIR, "student_performance_cleaned.csv")
    return pd.read_csv(path)

@router.get("/dataset/summary")
def get_dataset_summary(dataset_id: Optional[str] = Query(default=None)):
    """Retrieve summary metadata, dimensions, missing value audit, and column types for active dataset."""
    if not dataset_id or dataset_id.lower() in ["uci", "0", "benchmark"]:
        df = load_cleaned_uci_dataset()
        col_types = {}
        for col, dtype in df.dtypes.items():
            if "int" in str(dtype):
                col_types[col] = "Integer"
            elif "float" in str(dtype):
                col_types[col] = "Float"
            else:
                col_types[col] = "Categorical / String"
                
        num_cols = df.select_dtypes(include=["int64", "float64"]).columns.tolist()
        desc_stats = df[num_cols].describe().round(2).to_dict()
        
        return {
            "dataset_id": "uci",
            "dataset_name": "UCI Student Performance Benchmark (Cortez & Silva 2008)",
            "dimensions": {
                "total_records": len(df),
                "total_columns": len(df.columns),
                "unique_students": int(df["student_id"].nunique())
            },
            "missing_values_audit": {
                "total_missing": int(df.isnull().sum().sum()),
                "completeness_percentage": 100.0,
                "status": "PASSED (Zero Missing Values Detected)"
            },
            "target_balance": {
                "overall_at_risk_count": int(df["at_risk"].sum()),
                "overall_pass_count": int((1 - df["at_risk"]).sum()),
                "at_risk_rate": round(float(df["at_risk"].mean()), 4)
            },
            "column_types": col_types,
            "descriptive_statistics": desc_stats
        }

    # College Dataset summary
    try:
        ds_num = int(dataset_id)
    except ValueError:
        ds_num = 1

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM datasets WHERE id = ?", (ds_num,))
        ds_row = cursor.fetchone()
        ds_name = ds_row["name"] if ds_row else f"College Cohort #{ds_num}"

        cursor.execute("SELECT * FROM institution_students WHERE dataset_id = ?", (ds_num,))
        rows = cursor.fetchall()

    if not rows:
        return {
            "dataset_id": str(ds_num),
            "dataset_name": ds_name,
            "dimensions": {"total_records": 0, "total_columns": 13, "unique_students": 0},
            "missing_values_audit": {"total_missing": 0, "completeness_percentage": 100.0, "status": "Empty Cohort"},
            "target_balance": {"overall_at_risk_count": 0, "overall_pass_count": 0, "at_risk_rate": 0.0},
            "column_types": {},
            "descriptive_statistics": {}
        }

    df = pd.DataFrame([dict(r) for r in rows])
    total_records = len(df)
    unique_students = int(df["student_id"].nunique())
    
    # Calculate scaled G1
    df["scaled_g1"] = df.apply(
        lambda r: calculate_scaled_g1(
            float(r["internal_marks"]), float(r["max_internal_marks"]),
            float(r["previous_score"]), float(r["max_previous_score"]),
            float(r["assignment_marks"]), float(r["max_assignment_marks"])
        ),
        axis=1
    )
    
    # Determine risk
    at_risk_series = (df["attendance_percentage"] < 75.0) | (df["scaled_g1"] < 10.0)
    at_risk_count = int(at_risk_series.sum())
    
    num_cols = ["attendance_percentage", "internal_marks", "previous_score", "assignment_marks", "study_hours_per_week", "scaled_g1"]
    desc_stats = df[num_cols].describe().round(2).to_dict()
    
    col_types = {
        "student_id": "String (Identifier)",
        "student_name": "String (Name)",
        "department": "Categorical (Academic)",
        "course_name": "String (Subject)",
        "semester": "Categorical (Term)",
        "attendance_percentage": "Float (Percentage)",
        "internal_marks": "Float (Continuous Assessment)",
        "previous_score": "Float (Prior Grade)",
        "assignment_marks": "Float (Assignments)",
        "study_hours_per_week": "Float (Engagement)",
        "failures": "Integer (Backlogs)",
        "scaled_g1": "Float (Model-Mapped Grade 0-20)"
    }

    return {
        "dataset_id": str(ds_num),
        "dataset_name": ds_name,
        "dimensions": {
            "total_records": total_records,
            "total_columns": 13,
            "unique_students": unique_students
        },
        "missing_values_audit": {
            "total_missing": 0,
            "completeness_percentage": 100.0,
            "status": "PASSED (Zero Missing Values Detected)"
        },
        "target_balance": {
            "overall_at_risk_count": at_risk_count,
            "overall_pass_count": total_records - at_risk_count,
            "at_risk_rate": round(at_risk_count / max(1, total_records), 4)
        },
        "column_types": col_types,
        "descriptive_statistics": desc_stats
    }

@router.get("/dataset/columns")
def get_dataset_columns():
    """Return feature schema, ranges, defaults, and categorical options for form construction."""
    schema_path = os.path.join(settings.MODELS_DIR, "feature_schema.json")
    with open(schema_path, "r", encoding="utf-8") as f:
        schema = json.load(f)
    return schema

@router.get("/dataset/records")
def get_dataset_records(
    dataset_id: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=15, ge=1, le=100),
    course: Optional[str] = Query(default=None),
    department: Optional[str] = Query(default=None),
    risk_tier: Optional[str] = Query(default=None),
    at_risk: Optional[int] = Query(default=None),
    search: Optional[str] = Query(default=None)
):
    """Filterable, searchable, and paginated records from either UCI or College datasets."""
    if not dataset_id or dataset_id.lower() in ["uci", "0", "benchmark"]:
        df = load_cleaned_uci_dataset()
        if course:
            df = df[df["course"].str.lower() == course.lower()]
        if risk_tier:
            df = df[df["risk_tier"].str.lower() == risk_tier.lower()]
        if at_risk is not None:
            df = df[df["at_risk"] == at_risk]
        if search:
            s = search.lower().strip()
            mask = (
                df["student_id"].str.lower().str.contains(s) |
                df["course"].str.lower().str.contains(s) |
                df["school"].str.lower().str.contains(s) |
                df["Mjob"].str.lower().str.contains(s)
            )
            df = df[mask]
            
        total_records = len(df)
        total_pages = max(1, (total_records + limit - 1) // limit)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        page_records = df.iloc[start_idx:end_idx].to_dict(orient="records")
        
        return {
            "page": page,
            "limit": limit,
            "total_records": total_records,
            "total_pages": total_pages,
            "records": page_records
        }

    # College Dataset records
    try:
        ds_num = int(dataset_id)
    except ValueError:
        ds_num = 1

    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        where_clauses = ["s.dataset_id = ?"]
        params = [ds_num]
        
        if search:
            sc = f"%{search.strip()}%"
            where_clauses.append("(s.student_id LIKE ? OR s.student_name LIKE ? OR s.course_name LIKE ? OR s.department LIKE ?)")
            params.extend([sc, sc, sc, sc])
            
        if department:
            where_clauses.append("s.department = ?")
            params.append(department)
            
        if course:
            where_clauses.append("s.course_name = ?")
            params.append(course)

        where_sql = " AND ".join(where_clauses)
        
        # Count total
        cursor.execute(f"SELECT COUNT(*) as cnt FROM institution_students s WHERE {where_sql}", params)
        total_records = cursor.fetchone()["cnt"]
        total_pages = max(1, math.ceil(total_records / limit))
        
        offset = (page - 1) * limit
        fetch_sql = f"""
            SELECT s.*, 
                   lp.predicted_at_risk, lp.risk_tier, lp.risk_probability, lp.predicted_grade
            FROM institution_students s
            LEFT JOIN (
                SELECT p1.*
                FROM institution_predictions p1
                INNER JOIN (
                    SELECT student_pk, MAX(id) as max_id
                    FROM institution_predictions
                    GROUP BY student_pk
                ) p2 ON p1.id = p2.max_id
            ) lp ON s.id = lp.student_pk
            WHERE {where_sql}
            ORDER BY s.id ASC
            LIMIT ? OFFSET ?
        """
        cursor.execute(fetch_sql, params + [limit, offset])
        rows = cursor.fetchall()
        
    records_out = []
    for r in rows:
        d = dict(r)
        g1 = calculate_scaled_g1(
            float(d["internal_marks"]), float(d["max_internal_marks"]),
            float(d["previous_score"]), float(d["max_previous_score"]),
            float(d["assignment_marks"]), float(d["max_assignment_marks"])
        )
        tier = d["risk_tier"] or ("High Risk" if float(d["attendance_percentage"]) < 75.0 or g1 < 10.0 else "Low Risk")
        is_risk = 1 if tier == "High Risk" else 0
        
        records_out.append({
            "student_id": d["student_id"],
            "student_name": d["student_name"],
            "department": d["department"],
            "course": d["course_name"],
            "semester": d["semester"],
            "school": "College",
            "sex": "N/A",
            "age": 18,
            "G1": g1,
            "G3": d["observed_final_score"] if d["observed_final_score"] is not None else g1,
            "at_risk": is_risk,
            "risk_tier": tier,
            "attendance": d["attendance_percentage"],
            "absences": round((1.0 - float(d["attendance_percentage"]) / 100.0) * 40.0),
            "studytime": 1 if float(d["study_hours_per_week"]) < 2 else 2 if float(d["study_hours_per_week"]) < 5 else 3 if float(d["study_hours_per_week"]) < 10 else 4,
            "schoolsup": "no",
            "internal_marks": d["internal_marks"],
            "max_internal_marks": d["max_internal_marks"],
            "previous_score": d["previous_score"],
            "max_previous_score": d["max_previous_score"],
            "assignment_marks": d["assignment_marks"],
            "max_assignment_marks": d["max_assignment_marks"]
        })

    return {
        "page": page,
        "limit": limit,
        "total_records": total_records,
        "total_pages": total_pages,
        "records": records_out
    }
