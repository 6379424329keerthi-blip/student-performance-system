import json
import math
import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import ValidationError

from backend.app.database.db import get_db_connection
from backend.app.schemas.institution import (
    StudentCreateInput,
    StudentUpdateInput,
    StudentResponse,
    BatchPredictRequest,
    BatchPredictResponse
)
from backend.app.services.college_feature_mapper import (
    calculate_scaled_g1,
    calculate_absences_from_attendance,
    map_student_to_prediction_input
)
from backend.app.services.ml_service import ml_service
from backend.app.services.recommendation_service import recommendation_service

router = APIRouter()

def _format_student_row(row, latest_pred=None) -> dict:
    d = dict(row)
    g1 = calculate_scaled_g1(
        internal=float(d["internal_marks"]),
        max_internal=float(d["max_internal_marks"]),
        previous_score=float(d["previous_score"]),
        max_previous=float(d["max_previous_score"]),
        assignment=float(d["assignment_marks"]),
        max_assignment=float(d["max_assignment_marks"])
    )
    absences = calculate_absences_from_attendance(float(d["attendance_percentage"]))
    
    pred_dict = None
    if latest_pred:
        pred_dict = {
            "prediction_id": latest_pred["id"],
            "predicted_at_risk": latest_pred["predicted_at_risk"],
            "predicted_outcome": latest_pred["predicted_outcome"],
            "risk_probability": latest_pred["risk_probability"],
            "predicted_grade": latest_pred["predicted_grade"],
            "risk_tier": latest_pred["risk_tier"],
            "confidence_percentage": latest_pred["confidence_percentage"],
            "confidence_level": latest_pred["confidence_level"],
            "shap_factors": json.loads(latest_pred["shap_factors"]) if latest_pred["shap_factors"] else [],
            "recommendations": json.loads(latest_pred["recommendations"]) if latest_pred["recommendations"] else [],
            "model_version": latest_pred["model_version"],
            "created_at": latest_pred["created_at"]
        }
        
    return {
        "id": d["id"],
        "dataset_id": d["dataset_id"],
        "student_id": d["student_id"],
        "student_name": d["student_name"],
        "email": d.get("email"),
        "department": d["department"],
        "course_name": d["course_name"],
        "semester": d["semester"],
        "academic_year": d.get("academic_year"),
        "attendance_percentage": float(d["attendance_percentage"]),
        "previous_score": float(d["previous_score"]),
        "max_previous_score": float(d["max_previous_score"]),
        "internal_marks": float(d["internal_marks"]),
        "max_internal_marks": float(d["max_internal_marks"]),
        "assignment_marks": float(d["assignment_marks"]),
        "max_assignment_marks": float(d["max_assignment_marks"]),
        "study_hours_per_week": float(d["study_hours_per_week"]),
        "failures": int(d["failures"]),
        "observed_final_score": float(d["observed_final_score"]) if d.get("observed_final_score") is not None else None,
        "observed_at_risk": int(d["observed_at_risk"]) if d.get("observed_at_risk") is not None else None,
        "scaled_g1_score": g1,
        "calculated_absences": absences,
        "latest_prediction": pred_dict,
        "created_at": str(d.get("created_at", "")),
        "updated_at": str(d.get("updated_at", ""))
    }

@router.get("/students")
def list_college_students(
    dataset_id: int = Query(default=1, description="Dataset ID"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=12, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    department: Optional[str] = Query(default=None),
    semester: Optional[str] = Query(default=None),
    risk_filter: Optional[str] = Query(default=None)
):
    """List institution students for a specific dataset with search and filters."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        where_clauses = ["s.dataset_id = ?"]
        params = [dataset_id]
        
        if search:
            search_clean = f"%{search.strip()}%"
            where_clauses.append("(s.student_id LIKE ? OR s.student_name LIKE ? OR s.email LIKE ? OR s.course_name LIKE ?)")
            params.extend([search_clean, search_clean, search_clean, search_clean])
            
        if department:
            where_clauses.append("s.department = ?")
            params.append(department)
            
        if semester:
            where_clauses.append("s.semester = ?")
            params.append(semester)

        where_sql = " AND ".join(where_clauses)
        
        # Subquery for latest prediction
        latest_pred_subquery = """
            SELECT p1.*
            FROM institution_predictions p1
            INNER JOIN (
                SELECT student_pk, MAX(id) as max_id
                FROM institution_predictions
                GROUP BY student_pk
            ) p2 ON p1.id = p2.max_id
        """
        
        if risk_filter:
            if risk_filter == "Not Scored":
                where_sql += " AND lp.id IS NULL"
            else:
                where_sql += " AND lp.risk_tier = ?"
                params.append(risk_filter)

        # Count total
        count_sql = f"""
            SELECT COUNT(*) as cnt
            FROM institution_students s
            LEFT JOIN ({latest_pred_subquery}) lp ON s.id = lp.student_pk
            WHERE {where_sql}
        """
        cursor.execute(count_sql, params)
        total_records = cursor.fetchone()["cnt"]
        total_pages = max(1, math.ceil(total_records / limit))
        
        # Paginated fetch
        offset = (page - 1) * limit
        fetch_sql = f"""
            SELECT s.*, 
                   lp.id as pred_id, lp.predicted_at_risk, lp.predicted_outcome,
                   lp.risk_probability, lp.predicted_grade, lp.risk_tier,
                   lp.confidence_percentage, lp.confidence_level, lp.shap_factors,
                   lp.recommendations, lp.model_version, lp.created_at as pred_created_at
            FROM institution_students s
            LEFT JOIN ({latest_pred_subquery}) lp ON s.id = lp.student_pk
            WHERE {where_sql}
            ORDER BY s.id DESC
            LIMIT ? OFFSET ?
        """
        cursor.execute(fetch_sql, params + [limit, offset])
        rows = cursor.fetchall()
        
        students_out = []
        for r in rows:
            latest_pred = None
            if r["pred_id"] is not None:
                latest_pred = {
                    "id": r["pred_id"],
                    "predicted_at_risk": r["predicted_at_risk"],
                    "predicted_outcome": r["predicted_outcome"],
                    "risk_probability": r["risk_probability"],
                    "predicted_grade": r["predicted_grade"],
                    "risk_tier": r["risk_tier"],
                    "confidence_percentage": r["confidence_percentage"],
                    "confidence_level": r["confidence_level"],
                    "shap_factors": r["shap_factors"],
                    "recommendations": r["recommendations"],
                    "model_version": r["model_version"],
                    "created_at": r["pred_created_at"]
                }
            students_out.append(_format_student_row(r, latest_pred))
            
        return {
            "dataset_id": dataset_id,
            "total_records": total_records,
            "page": page,
            "total_pages": total_pages,
            "records": students_out
        }

@router.post("/students", response_model=StudentResponse, status_code=201)
def create_college_student(input_data: StudentCreateInput):
    """Add a single college student manually with validation and assessment config."""
    now_iso = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Check target dataset exists
        cursor.execute("SELECT id FROM datasets WHERE id = ?", (input_data.dataset_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"Dataset with ID {input_data.dataset_id} does not exist.")
            
        # Check duplicate student_id within dataset
        cursor.execute(
            "SELECT id FROM institution_students WHERE dataset_id = ? AND student_id = ?",
            (input_data.dataset_id, input_data.student_id.strip())
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail=f"Student ID '{input_data.student_id.strip()}' already exists in this dataset."
            )
            
        add_json = json.dumps(input_data.additional_attributes) if input_data.additional_attributes else None
        
        # Calculate observed at-risk if observed_final_score is provided
        observed_at_risk = None
        if input_data.observed_final_score is not None:
            observed_at_risk = 1 if input_data.observed_final_score < 10.0 else 0
            
        cursor.execute("""
            INSERT INTO institution_students (
                dataset_id, student_id, student_name, email, department,
                course_name, semester, academic_year, attendance_percentage,
                previous_score, max_previous_score, internal_marks, max_internal_marks,
                assignment_marks, max_assignment_marks, study_hours_per_week,
                failures, observed_final_score, observed_at_risk, additional_attributes,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            input_data.dataset_id,
            input_data.student_id.strip(),
            input_data.student_name.strip(),
            input_data.email.strip() if input_data.email else None,
            input_data.department.strip(),
            input_data.course_name.strip(),
            input_data.semester.strip(),
            input_data.academic_year,
            input_data.attendance_percentage,
            input_data.previous_score,
            input_data.max_previous_score,
            input_data.internal_marks,
            input_data.max_internal_marks,
            input_data.assignment_marks,
            input_data.max_assignment_marks,
            input_data.study_hours_per_week,
            input_data.failures,
            input_data.observed_final_score,
            observed_at_risk,
            add_json,
            now_iso,
            now_iso
        ))
        new_id = cursor.lastrowid
        
        cursor.execute("SELECT * FROM institution_students WHERE id = ?", (new_id,))
        created_row = cursor.fetchone()
        return _format_student_row(created_row)

@router.get("/students/{student_pk}", response_model=StudentResponse)
def get_college_student_detail(student_pk: int = Path(..., description="Student Database Primary Key")):
    """Get single college student with latest prediction."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM institution_students WHERE id = ?", (student_pk,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Student record with ID {student_pk} not found.")
            
        cursor.execute("""
            SELECT * FROM institution_predictions 
            WHERE student_pk = ? 
            ORDER BY id DESC LIMIT 1
        """, (student_pk,))
        pred_row = cursor.fetchone()
        
        return _format_student_row(row, pred_row)

@router.put("/students/{student_pk}", response_model=StudentResponse)
def update_college_student(student_pk: int, update_data: StudentUpdateInput):
    """Update student record fields with validation."""
    now_iso = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM institution_students WHERE id = ?", (student_pk,))
        current = cursor.fetchone()
        if not current:
            raise HTTPException(status_code=404, detail=f"Student record with ID {student_pk} not found.")
            
        curr_dict = dict(current)
        up_dict = update_data.model_dump(exclude_unset=True)
        
        # Merge fields
        merged = {**curr_dict, **up_dict}
        
        # Validate marks bounds on merged values
        if float(merged["internal_marks"]) > float(merged["max_internal_marks"]):
            raise HTTPException(status_code=400, detail="Internal marks cannot exceed maximum internal marks.")
        if float(merged["previous_score"]) > float(merged["max_previous_score"]):
            raise HTTPException(status_code=400, detail="Previous score cannot exceed maximum previous score.")
        if float(merged["assignment_marks"]) > float(merged["max_assignment_marks"]):
            raise HTTPException(status_code=400, detail="Assignment marks cannot exceed maximum assignment marks.")
            
        add_json = json.dumps(merged["additional_attributes"]) if merged.get("additional_attributes") else None
        
        observed_at_risk = None
        if merged.get("observed_final_score") is not None:
            observed_at_risk = 1 if float(merged["observed_final_score"]) < 10.0 else 0

        cursor.execute("""
            UPDATE institution_students SET
                student_name = ?,
                email = ?,
                department = ?,
                course_name = ?,
                semester = ?,
                academic_year = ?,
                attendance_percentage = ?,
                previous_score = ?,
                max_previous_score = ?,
                internal_marks = ?,
                max_internal_marks = ?,
                assignment_marks = ?,
                max_assignment_marks = ?,
                study_hours_per_week = ?,
                failures = ?,
                observed_final_score = ?,
                observed_at_risk = ?,
                additional_attributes = ?,
                updated_at = ?
            WHERE id = ?
        """, (
            merged["student_name"],
            merged.get("email"),
            merged["department"],
            merged["course_name"],
            merged["semester"],
            merged.get("academic_year"),
            float(merged["attendance_percentage"]),
            float(merged["previous_score"]),
            float(merged["max_previous_score"]),
            float(merged["internal_marks"]),
            float(merged["max_internal_marks"]),
            float(merged["assignment_marks"]),
            float(merged["max_assignment_marks"]),
            float(merged["study_hours_per_week"]),
            int(merged["failures"]),
            float(merged["observed_final_score"]) if merged.get("observed_final_score") is not None else None,
            observed_at_risk,
            add_json,
            now_iso,
            student_pk
        ))
        
        cursor.execute("SELECT * FROM institution_students WHERE id = ?", (student_pk,))
        updated_row = cursor.fetchone()
        
        cursor.execute("""
            SELECT * FROM institution_predictions 
            WHERE student_pk = ? 
            ORDER BY id DESC LIMIT 1
        """, (student_pk,))
        pred_row = cursor.fetchone()
        
        return _format_student_row(updated_row, pred_row)

@router.delete("/students/{student_pk}")
def delete_college_student(student_pk: int):
    """Delete a student record and their associated predictions."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT student_id FROM institution_students WHERE id = ?", (student_pk,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Student record with ID {student_pk} not found.")
            
        cursor.execute("DELETE FROM institution_students WHERE id = ?", (student_pk,))
        return {"success": True, "message": f"Student {row['student_id']} deleted successfully."}

@router.post("/students/{student_pk}/predict")
def predict_college_student(student_pk: int):
    """Run real machine learning prediction on a specific college student."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM institution_students WHERE id = ?", (student_pk,))
        student_row = cursor.fetchone()
        if not student_row:
            raise HTTPException(status_code=404, detail=f"Student record with ID {student_pk} not found.")
            
        pred_input = map_student_to_prediction_input(student_row)
        pred_result = ml_service.predict(pred_input)
        recs = recommendation_service.generate_recommendations(pred_input, pred_result)
        
        now_iso = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        cursor.execute("""
            INSERT INTO institution_predictions (
                student_pk, dataset_id, student_id, predicted_at_risk,
                predicted_outcome, risk_probability, predicted_grade,
                risk_tier, confidence_percentage, confidence_level,
                shap_factors, recommendations, model_version, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            student_pk,
            student_row["dataset_id"],
            student_row["student_id"],
            pred_result["predicted_at_risk"],
            pred_result["predicted_outcome"],
            pred_result["risk_probability"],
            pred_result["predicted_grade"],
            pred_result["risk_tier"],
            pred_result["confidence_percentage"],
            pred_result["confidence_level"],
            json.dumps([f.model_dump() for f in pred_result["contributing_factors"]]),
            json.dumps([r.model_dump() for r in recs]),
            "RandomForestClassifier-v1.0.0",
            now_iso
        ))
        prediction_id = cursor.lastrowid
        
        return {
            "prediction_id": prediction_id,
            "student_pk": student_pk,
            "student_id": student_row["student_id"],
            "student_name": student_row["student_name"],
            "department": student_row["department"],
            "course_name": student_row["course_name"],
            "predicted_at_risk": pred_result["predicted_at_risk"],
            "predicted_outcome": pred_result["predicted_outcome"],
            "risk_probability": pred_result["risk_probability"],
            "confidence_percentage": pred_result["confidence_percentage"],
            "confidence_level": pred_result["confidence_level"],
            "predicted_grade": pred_result["predicted_grade"],
            "risk_tier": pred_result["risk_tier"],
            "contributing_factors": pred_result["contributing_factors"],
            "supportive_recommendations": recs,
            "created_at": now_iso
        }

@router.post("/students/batch-predict", response_model=BatchPredictResponse)
def batch_predict_college_students(payload: BatchPredictRequest):
    """Execute batch ML prediction across all or selected students in a dataset."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        if payload.student_ids and len(payload.student_ids) > 0:
            placeholders = ",".join("?" for _ in payload.student_ids)
            sql = f"SELECT * FROM institution_students WHERE dataset_id = ? AND id IN ({placeholders})"
            cursor.execute(sql, [payload.dataset_id] + payload.student_ids)
        else:
            cursor.execute("SELECT * FROM institution_students WHERE dataset_id = ?", (payload.dataset_id,))
            
        students = cursor.fetchall()
        if not students:
            return BatchPredictResponse(
                dataset_id=payload.dataset_id,
                total_predicted=0,
                high_risk_count=0,
                moderate_risk_count=0,
                low_risk_count=0,
                results=[]
            )
            
        high_risk = 0
        mod_risk = 0
        low_risk = 0
        results_list = []
        now_iso = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        for stu in students:
            pred_input = map_student_to_prediction_input(stu)
            pred_result = ml_service.predict(pred_input)
            recs = recommendation_service.generate_recommendations(pred_input, pred_result)
            
            if pred_result["risk_tier"] == "High Risk":
                high_risk += 1
            elif pred_result["risk_tier"] == "Moderate Risk":
                mod_risk += 1
            else:
                low_risk += 1
                
            cursor.execute("""
                INSERT INTO institution_predictions (
                    student_pk, dataset_id, student_id, predicted_at_risk,
                    predicted_outcome, risk_probability, predicted_grade,
                    risk_tier, confidence_percentage, confidence_level,
                    shap_factors, recommendations, model_version, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                stu["id"],
                stu["dataset_id"],
                stu["student_id"],
                pred_result["predicted_at_risk"],
                pred_result["predicted_outcome"],
                pred_result["risk_probability"],
                pred_result["predicted_grade"],
                pred_result["risk_tier"],
                pred_result["confidence_percentage"],
                pred_result["confidence_level"],
                json.dumps([f.model_dump() for f in pred_result["contributing_factors"]]),
                json.dumps([r.model_dump() for r in recs]),
                "RandomForestClassifier-v1.0.0",
                now_iso
            ))
            
            results_list.append({
                "student_pk": stu["id"],
                "student_id": stu["student_id"],
                "student_name": stu["student_name"],
                "department": stu["department"],
                "predicted_at_risk": pred_result["predicted_at_risk"],
                "predicted_outcome": pred_result["predicted_outcome"],
                "risk_probability": pred_result["risk_probability"],
                "predicted_grade": pred_result["predicted_grade"],
                "risk_tier": pred_result["risk_tier"],
                "confidence_percentage": pred_result["confidence_percentage"]
            })
            
        return BatchPredictResponse(
            dataset_id=payload.dataset_id,
            total_predicted=len(results_list),
            high_risk_count=high_risk,
            moderate_risk_count=mod_risk,
            low_risk_count=low_risk,
            results=results_list
        )

@router.get("/students/{student_pk}/predictions")
def get_student_prediction_history(student_pk: int):
    """Retrieve all historical predictions for a specific student."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM institution_predictions 
            WHERE student_pk = ? 
            ORDER BY id DESC
        """, (student_pk,))
        rows = cursor.fetchall()
        
        history = []
        for r in rows:
            history.append({
                "id": r["id"],
                "student_pk": r["student_pk"],
                "student_id": r["student_id"],
                "predicted_at_risk": r["predicted_at_risk"],
                "predicted_outcome": r["predicted_outcome"],
                "risk_probability": r["risk_probability"],
                "predicted_grade": r["predicted_grade"],
                "risk_tier": r["risk_tier"],
                "confidence_percentage": r["confidence_percentage"],
                "confidence_level": r["confidence_level"],
                "shap_factors": json.loads(r["shap_factors"]) if r["shap_factors"] else [],
                "recommendations": json.loads(r["recommendations"]) if r["recommendations"] else [],
                "created_at": r["created_at"]
            })
        return history
