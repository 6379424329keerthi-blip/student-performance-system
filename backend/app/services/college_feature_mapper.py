import json
from typing import Dict, Any, Union
from backend.app.schemas.prediction import PredictionInput

def calculate_scaled_g1(
    internal: float,
    max_internal: float,
    previous_score: float,
    max_previous: float,
    assignment: float = 0.0,
    max_assignment: float = 25.0
) -> float:
    """
    Scale multi-component college continuous assessments onto the 0-20 G1 academic scale.
    Weights: Internal Assessment (50%), Previous Academic Performance (35%), Lab/Assignments (15%).
    """
    safe_max_int = max_internal if max_internal > 0 else 25.0
    safe_max_prev = max_previous if max_previous > 0 else 100.0
    safe_max_assign = max_assignment if max_assignment > 0 else 25.0
    
    norm_int = min(1.0, max(0.0, internal / safe_max_int))
    norm_prev = min(1.0, max(0.0, previous_score / safe_max_prev))
    norm_assign = min(1.0, max(0.0, assignment / safe_max_assign))
    
    composite_ratio = (0.50 * norm_int) + (0.35 * norm_prev) + (0.15 * norm_assign)
    g1_scaled = round(composite_ratio * 20.0, 1)
    return max(0.0, min(20.0, g1_scaled))

def calculate_absences_from_attendance(attendance_percentage: float) -> int:
    """
    Map institution attendance percentage (0-100%) to expected absent class sessions (0-93).
    A standard academic semester contains ~40 class contact sessions.
    """
    att = max(0.0, min(100.0, attendance_percentage))
    miss_ratio = (100.0 - att) / 100.0
    absences = round(miss_ratio * 40.0)
    return max(0, min(93, absences))

def calculate_studytime_tier(hours_per_week: float) -> int:
    """
    Map raw self-study hours per week into standard ordinal 1-4 scale.
    1: < 2 hours/wk
    2: 2 - 5 hours/wk
    3: 5 - 10 hours/wk
    4: > 10 hours/wk
    """
    if hours_per_week < 2.0:
        return 1
    elif hours_per_week < 5.0:
        return 2
    elif hours_per_week < 10.0:
        return 3
    else:
        return 4

def map_student_to_prediction_input(student: Union[Dict[str, Any], Any]) -> PredictionInput:
    """
    Convert a college student record (dict or sqlite3.Row) into a validated PredictionInput instance
    compatible with the trained ML Random Forest & Gradient Boosting pipelines.
    """
    if hasattr(student, "keys"):
        data = dict(student)
    else:
        data = student.__dict__ if hasattr(student, "__dict__") else dict(student)
        
    # Unpack JSON additional_attributes if present
    add_attrs = {}
    if data.get("additional_attributes"):
        raw_attrs = data["additional_attributes"]
        if isinstance(raw_attrs, str):
            try:
                add_attrs = json.loads(raw_attrs)
            except Exception:
                add_attrs = {}
        elif isinstance(raw_attrs, dict):
            add_attrs = raw_attrs

    # Compute scaled academic features
    g1 = calculate_scaled_g1(
        internal=float(data.get("internal_marks", 0.0)),
        max_internal=float(data.get("max_internal_marks", 25.0)),
        previous_score=float(data.get("previous_score", 0.0)),
        max_previous=float(data.get("max_previous_score", 100.0)),
        assignment=float(data.get("assignment_marks", 0.0)),
        max_assignment=float(data.get("max_assignment_marks", 25.0))
    )
    
    attendance = float(data.get("attendance_percentage", 85.0))
    absences = calculate_absences_from_attendance(attendance)
    
    study_hours = float(data.get("study_hours_per_week", 5.0))
    studytime = calculate_studytime_tier(study_hours)
    
    failures = int(data.get("failures", 0))
    failures = max(0, min(4, failures))
    
    # Infer course domain
    course_name = str(data.get("course_name", "")).lower()
    math_indicators = ["math", "calculus", "algebra", "stats", "data", "cs", "computer", "engineering", "quant", "physics", "ai", "ml"]
    is_stem = any(ind in course_name for ind in math_indicators)
    course_literal = "Math" if is_stem else "Portuguese"

    return PredictionInput(
        student_identifier=str(data.get("student_id", "STU_COLLEGE")),
        course=course_literal,
        G1=g1,
        failures=failures,
        absences=absences,
        studytime=studytime,
        schoolsup=add_attrs.get("schoolsup", "no"),
        famsup=add_attrs.get("famsup", "yes"),
        paid=add_attrs.get("paid", "no"),
        higher=add_attrs.get("higher", "yes"),
        school=add_attrs.get("school", "GP"),
        sex=add_attrs.get("sex", "F"),
        age=int(add_attrs.get("age", 17)),
        address=add_attrs.get("address", "U"),
        famsize=add_attrs.get("famsize", "GT3"),
        Pstatus=add_attrs.get("Pstatus", "T"),
        Medu=int(add_attrs.get("Medu", 3)),
        Fedu=int(add_attrs.get("Fedu", 3)),
        Mjob=add_attrs.get("Mjob", "services"),
        Fjob=add_attrs.get("Fjob", "services"),
        reason=add_attrs.get("reason", "course"),
        guardian=add_attrs.get("guardian", "mother"),
        traveltime=int(add_attrs.get("traveltime", 1)),
        activities=add_attrs.get("activities", "yes"),
        nursery=add_attrs.get("nursery", "yes"),
        internet=add_attrs.get("internet", "yes"),
        romantic=add_attrs.get("romantic", "no"),
        famrel=int(add_attrs.get("famrel", 4)),
        freetime=int(add_attrs.get("freetime", 3)),
        goout=int(add_attrs.get("goout", 3)),
        Dalc=int(add_attrs.get("Dalc", 1)),
        Walc=int(add_attrs.get("Walc", 2)),
        health=int(add_attrs.get("health", 4))
    )
