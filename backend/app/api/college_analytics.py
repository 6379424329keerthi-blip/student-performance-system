import json
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from backend.app.database.db import get_db_connection
from backend.app.services.college_feature_mapper import calculate_scaled_g1

router = APIRouter()

@router.get("/analytics/summary")
def get_college_analytics_summary(dataset_id: int = Query(default=1, description="Dataset ID")):
    """
    Compute comprehensive real dynamic academic analytics across college students in a dataset.
    Computes score distribution, attendance brackets, department averages, and ML risk status.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Verify dataset exists
        cursor.execute("SELECT name FROM datasets WHERE id = ?", (dataset_id,))
        d_row = cursor.fetchone()
        if not d_row:
            raise HTTPException(status_code=404, detail=f"Dataset with ID {dataset_id} not found.")
            
        dataset_name = d_row["name"]
        
        # Fetch all students in dataset with their latest prediction
        cursor.execute("""
            SELECT s.*,
                   lp.predicted_at_risk, lp.risk_tier, lp.predicted_grade, lp.risk_probability
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
            WHERE s.dataset_id = ?
        """, (dataset_id,))
        students = cursor.fetchall()
        
    total_students = len(students)
    if total_students == 0:
        return {
            "dataset_id": dataset_id,
            "dataset_name": dataset_name,
            "total_students": 0,
            "avg_attendance": 0.0,
            "avg_internal_pct": 0.0,
            "avg_previous_pct": 0.0,
            "avg_scaled_g1": 0.0,
            "at_risk_count": 0,
            "at_risk_percentage": 0.0,
            "predicted_high_risk_count": 0,
            "predicted_moderate_risk_count": 0,
            "predicted_low_risk_count": 0,
            "unpredicted_count": 0,
            "score_distribution": [
                {"range": "0 - 5 (Severe Fail)", "count": 0, "percentage": 0.0},
                {"range": "6 - 9 (Warning / Fail)", "count": 0, "percentage": 0.0},
                {"range": "10 - 13 (Satisfactory)", "count": 0, "percentage": 0.0},
                {"range": "14 - 16 (Good)", "count": 0, "percentage": 0.0},
                {"range": "17 - 20 (Excellent)", "count": 0, "percentage": 0.0}
            ],
            "attendance_brackets": [
                {"category": "Critical (< 75%)", "count": 0, "percentage": 0.0, "color": "#dc2626"},
                {"category": "Warning (75% - 85%)", "count": 0, "percentage": 0.0, "color": "#d97706"},
                {"category": "Good (> 85%)", "count": 0, "percentage": 0.0, "color": "#059669"}
            ],
            "department_breakdown": [],
            "study_time_breakdown": []
        }

    # Aggregate calculations
    total_att = 0.0
    total_int_pct = 0.0
    total_prev_pct = 0.0
    total_g1 = 0.0
    
    score_bins = {
        "0 - 5 (Severe Fail)": 0,
        "6 - 9 (Warning / Fail)": 0,
        "10 - 13 (Satisfactory)": 0,
        "14 - 16 (Good)": 0,
        "17 - 20 (Excellent)": 0
    }
    
    att_brackets = {
        "Critical (< 75%)": 0,
        "Warning (75% - 85%)": 0,
        "Good (> 85%)": 0
    }
    
    study_bins = {
        "< 2 hrs/wk": {"count": 0, "total_g1": 0.0},
        "2 - 5 hrs/wk": {"count": 0, "total_g1": 0.0},
        "5 - 10 hrs/wk": {"count": 0, "total_g1": 0.0},
        "> 10 hrs/wk": {"count": 0, "total_g1": 0.0}
    }
    
    dept_map = {}
    high_risk_count = 0
    mod_risk_count = 0
    low_risk_count = 0
    unpredicted_count = 0

    for s in students:
        att = float(s["attendance_percentage"])
        total_att += att
        
        # Attendance brackets
        if att < 75.0:
            att_brackets["Critical (< 75%)"] += 1
        elif att <= 85.0:
            att_brackets["Warning (75% - 85%)"] += 1
        else:
            att_brackets["Good (> 85%)"] += 1

        # Assessment percentages
        max_int = float(s["max_internal_marks"]) or 25.0
        max_prev = float(s["max_previous_score"]) or 100.0
        max_assign = float(s["max_assignment_marks"]) or 25.0
        
        int_pct = (float(s["internal_marks"]) / max_int) * 100.0
        prev_pct = (float(s["previous_score"]) / max_prev) * 100.0
        total_int_pct += int_pct
        total_prev_pct += prev_pct

        # Scaled G1 score
        g1 = calculate_scaled_g1(
            internal=float(s["internal_marks"]),
            max_internal=max_int,
            previous_score=float(s["previous_score"]),
            max_previous=max_prev,
            assignment=float(s["assignment_marks"]),
            max_assignment=max_assign
        )
        total_g1 += g1

        # Score distribution bins
        if g1 < 6.0:
            score_bins["0 - 5 (Severe Fail)"] += 1
        elif g1 < 10.0:
            score_bins["6 - 9 (Warning / Fail)"] += 1
        elif g1 < 14.0:
            score_bins["10 - 13 (Satisfactory)"] += 1
        elif g1 < 17.0:
            score_bins["14 - 16 (Good)"] += 1
        else:
            score_bins["17 - 20 (Excellent)"] += 1

        # Study hours grouping
        hours = float(s["study_hours_per_week"])
        if hours < 2.0:
            study_key = "< 2 hrs/wk"
        elif hours < 5.0:
            study_key = "2 - 5 hrs/wk"
        elif hours < 10.0:
            study_key = "5 - 10 hrs/wk"
        else:
            study_key = "> 10 hrs/wk"
        study_bins[study_key]["count"] += 1
        study_bins[study_key]["total_g1"] += g1

        # ML Risk Tier counts
        tier = s["risk_tier"]
        if tier == "High Risk":
            high_risk_count += 1
        elif tier == "Moderate Risk":
            mod_risk_count += 1
        elif tier == "Low Risk":
            low_risk_count += 1
        else:
            unpredicted_count += 1

        # Department grouping
        dept = s["department"] or "General"
        if dept not in dept_map:
            dept_map[dept] = {
                "department": dept,
                "student_count": 0,
                "total_att": 0.0,
                "total_g1": 0.0,
                "high_risk_count": 0
            }
        dept_map[dept]["student_count"] += 1
        dept_map[dept]["total_att"] += att
        dept_map[dept]["total_g1"] += g1
        if tier == "High Risk" or (tier is None and g1 < 10.0):
            dept_map[dept]["high_risk_count"] += 1

    # Format department list
    dept_breakdown = []
    for d, data in dept_map.items():
        c = data["student_count"]
        dept_breakdown.append({
            "department": d,
            "student_count": c,
            "avg_attendance": round(data["total_att"] / c, 1),
            "avg_scaled_g1": round(data["total_g1"] / c, 1),
            "high_risk_count": data["high_risk_count"],
            "risk_rate_percentage": round((data["high_risk_count"] / c) * 100.0, 1)
        })

    # Format study time breakdown
    study_breakdown = []
    for k, v in study_bins.items():
        avg_g1_bin = round(v["total_g1"] / v["count"], 1) if v["count"] > 0 else 0.0
        study_breakdown.append({
            "bracket": k,
            "student_count": v["count"],
            "avg_scaled_g1": avg_g1_bin
        })

    # General at-risk count (either predicted High Risk, or if unpredicted, composite G1 < 10 or attendance < 75%)
    at_risk_general = sum(
        1 for s in students 
        if s["risk_tier"] == "High Risk" or (s["risk_tier"] is None and (float(s["attendance_percentage"]) < 75.0 or float(s["internal_marks"]) / (float(s["max_internal_marks"]) or 25.0) < 0.40))
    )

    return {
        "dataset_id": dataset_id,
        "dataset_name": dataset_name,
        "total_students": total_students,
        "avg_attendance": round(total_att / total_students, 1),
        "avg_internal_pct": round(total_int_pct / total_students, 1),
        "avg_previous_pct": round(total_prev_pct / total_students, 1),
        "avg_scaled_g1": round(total_g1 / total_students, 1),
        "at_risk_count": at_risk_general,
        "at_risk_percentage": round((at_risk_general / total_students) * 100.0, 1),
        "predicted_high_risk_count": high_risk_count,
        "predicted_moderate_risk_count": mod_risk_count,
        "predicted_low_risk_count": low_risk_count,
        "unpredicted_count": unpredicted_count,
        "score_distribution": [
            {
                "range": k,
                "count": v,
                "percentage": round((v / total_students) * 100.0, 1)
            }
            for k, v in score_bins.items()
        ],
        "attendance_brackets": [
            {
                "category": k,
                "count": v,
                "percentage": round((v / total_students) * 100.0, 1),
                "color": "#dc2626" if "Critical" in k else "#d97706" if "Warning" in k else "#059669"
            }
            for k, v in att_brackets.items()
        ],
        "department_breakdown": dept_breakdown,
        "study_time_breakdown": study_breakdown
    }
