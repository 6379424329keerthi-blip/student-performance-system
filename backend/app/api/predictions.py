import json
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend.app.database.db import get_db_connection

router = APIRouter()

@router.get("/predictions")
def list_prediction_history(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    course: Optional[str] = Query(default=None),
    risk_tier: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None)
):
    """Retrieve paginated prediction history from SQLite."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        where_clauses = []
        params = []
        
        if course:
            where_clauses.append("LOWER(course) = LOWER(?)")
            params.append(course)
        if risk_tier:
            where_clauses.append("LOWER(risk_tier) = LOWER(?)")
            params.append(risk_tier)
        if search:
            where_clauses.append("LOWER(student_identifier) LIKE LOWER(?)")
            params.append(f"%{search}%")
            
        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        
        # Count
        cursor.execute(f"SELECT COUNT(*) as cnt FROM predictions {where_sql}", params)
        total_records = cursor.fetchone()["cnt"]
        total_pages = max(1, (total_records + limit - 1) // limit)
        
        # Paginated query
        offset = (page - 1) * limit
        cursor.execute(f"""
            SELECT id, student_identifier, course, predicted_at_risk, risk_probability,
                   predicted_grade, risk_tier, confidence_level, created_at
            FROM predictions
            {where_sql}
            ORDER BY id DESC
            LIMIT ? OFFSET ?
        """, params + [limit, offset])
        
        records = []
        for r in cursor.fetchall():
            records.append({
                "id": r["id"],
                "student_identifier": r["student_identifier"],
                "course": r["course"],
                "predicted_at_risk": r["predicted_at_risk"],
                "predicted_outcome": "At Risk" if r["predicted_at_risk"] == 1 else "Pass / Satisfactory",
                "risk_probability": round(r["risk_probability"], 4),
                "predicted_grade": r["predicted_grade"],
                "risk_tier": r["risk_tier"],
                "confidence_level": r["confidence_level"],
                "created_at": r["created_at"]
            })
            
        return {
            "page": page,
            "limit": limit,
            "total_records": total_records,
            "total_pages": total_pages,
            "records": records
        }

@router.get("/predictions/{prediction_id}")
def get_prediction_detail(prediction_id: int):
    """Retrieve full prediction record with SHAP factor contributions and academic recommendations."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM predictions WHERE id = ?", (prediction_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Prediction record ID {prediction_id} not found.")
            
        return {
            "prediction_id": row["id"],
            "student_identifier": row["student_identifier"],
            "course": row["course"],
            "input_features": json.loads(row["input_features"]),
            "predicted_at_risk": row["predicted_at_risk"],
            "predicted_outcome": "At Risk" if row["predicted_at_risk"] == 1 else "Pass / Satisfactory",
            "risk_probability": row["risk_probability"],
            "confidence_percentage": round(max(row["risk_probability"], 1 - row["risk_probability"]) * 100, 1),
            "confidence_level": row["confidence_level"],
            "predicted_grade": row["predicted_grade"],
            "risk_tier": row["risk_tier"],
            "contributing_factors": json.loads(row["explanation"]),
            "supportive_recommendations": json.loads(row["recommendations"]),
            "created_at": row["created_at"]
        }

@router.delete("/predictions/{prediction_id}")
def delete_prediction(prediction_id: int):
    """Delete a prediction record from history."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM predictions WHERE id = ?", (prediction_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"Prediction record ID {prediction_id} not found.")
    return {"status": "success", "message": f"Prediction {prediction_id} deleted."}
