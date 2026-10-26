import os
import io
import json
import csv
import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Response, Query, Path, Form
from fastapi.responses import StreamingResponse
import pandas as pd

from backend.app.database.db import get_db_connection
from backend.app.schemas.institution import (
    DatasetCreateInput,
    DatasetResponse,
    UploadPreviewResponse,
    ValidationRequest,
    ValidationResponse,
    ImportRequest,
    ImportResponse,
    RowValidationError,
    AssessmentConfig
)
from backend.app.services.college_feature_mapper import (
    calculate_scaled_g1,
    calculate_absences_from_attendance
)

router = APIRouter()

FIELD_SYNONYMS = {
    "student_id": ["student_id", "roll_no", "rollno", "roll", "usn", "reg_no", "registration_no", "id", "student id"],
    "student_name": ["student_name", "name", "full_name", "student", "candidate_name", "student name"],
    "email": ["email", "student_email", "mail", "email_address"],
    "department": ["department", "dept", "branch", "stream", "major", "program"],
    "course_name": ["course_name", "course", "subject", "module", "subject_name"],
    "semester": ["semester", "sem", "term", "academic_semester"],
    "academic_year": ["academic_year", "year", "session", "batch"],
    "attendance_percentage": ["attendance_percentage", "attendance", "attendance_pct", "att_pct", "attendance %", "att"],
    "previous_score": ["previous_score", "prev_score", "prior_score", "cgpa", "prev_marks", "prerequisite_score"],
    "internal_marks": ["internal_marks", "internal", "internals", "midterm", "cie", "iat", "test_marks"],
    "assignment_marks": ["assignment_marks", "assignment", "assignments", "practical", "lab_marks", "lab"],
    "study_hours_per_week": ["study_hours_per_week", "study_hours", "study_time", "hours_per_week", "study hours"],
    "failures": ["failures", "backlogs", "arrears", "fails", "past_failures"],
    "observed_final_score": ["observed_final_score", "final_score", "final_grade", "g3", "final_marks", "actual_score"]
}

def _suggest_mapping(columns: List[str]) -> Dict[str, str]:
    """Suggest app field -> uploaded column mapping using heuristic keyword matching."""
    mapping = {}
    normalized_cols = {col.lower().strip().replace(" ", "_"): col for col in columns}
    
    for app_field, synonyms in FIELD_SYNONYMS.items():
        matched = None
        for syn in synonyms:
            # Exact match
            if syn in normalized_cols:
                matched = normalized_cols[syn]
                break
        if not matched:
            # Partial match
            for syn in synonyms:
                for norm_key, original in normalized_cols.items():
                    if syn in norm_key:
                        matched = original
                        break
                if matched:
                    break
        if matched:
            mapping[app_field] = matched
            
    return mapping

@router.get("/datasets")
def list_datasets():
    """List all student datasets/cohorts with student counts."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT d.id, d.name, d.description, d.department, d.semester, d.academic_year,
                   d.is_system_benchmark, d.created_at,
                   COUNT(s.id) as student_count
            FROM datasets d
            LEFT JOIN institution_students s ON d.id = s.dataset_id
            GROUP BY d.id
            ORDER BY d.id ASC
        """)
        rows = cursor.fetchall()
        return [
            {
                "id": r["id"],
                "name": r["name"],
                "description": r["description"],
                "department": r["department"],
                "semester": r["semester"],
                "academic_year": r["academic_year"],
                "is_system_benchmark": r["is_system_benchmark"],
                "student_count": r["student_count"],
                "created_at": str(r["created_at"])
            }
            for r in rows
        ]

@router.post("/datasets", response_model=DatasetResponse, status_code=201)
def create_dataset(payload: DatasetCreateInput):
    """Create a new college cohort dataset."""
    now_iso = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO datasets (name, description, department, semester, academic_year, is_system_benchmark, created_at)
            VALUES (?, ?, ?, ?, ?, 0, ?)
        """, (
            payload.name.strip(),
            payload.description.strip() if payload.description else "",
            payload.department.strip() if payload.department else "All Departments",
            payload.semester.strip() if payload.semester else "Semester 1",
            payload.academic_year.strip() if payload.academic_year else "2024-2025",
            now_iso
        ))
        new_id = cursor.lastrowid
        cursor.execute("SELECT * FROM datasets WHERE id = ?", (new_id,))
        r = cursor.fetchone()
        return {
            "id": r["id"],
            "name": r["name"],
            "description": r["description"],
            "department": r["department"],
            "semester": r["semester"],
            "academic_year": r["academic_year"],
            "is_system_benchmark": r["is_system_benchmark"],
            "student_count": 0,
            "created_at": str(r["created_at"])
        }

@router.delete("/datasets/{dataset_id}")
def delete_dataset(dataset_id: int):
    """Delete a custom college dataset and its students."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,))
        r = cursor.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Dataset not found.")
        if r["is_system_benchmark"] == 1:
            raise HTTPException(status_code=400, detail="Cannot delete system benchmark dataset.")
            
        cursor.execute("DELETE FROM datasets WHERE id = ?", (dataset_id,))
        return {"success": True, "message": f"Dataset '{r['name']}' deleted."}

@router.post("/datasets/preview", response_model=UploadPreviewResponse)
async def preview_uploaded_file(file: UploadFile = File(...)):
    """
    Parse uploaded CSV or Excel file and return column names, row preview, and suggested mappings.
    """
    filename = file.filename or "upload.csv"
    ext = filename.split(".")[-1].lower()
    
    if ext not in ["csv", "xlsx", "xls"]:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a .csv or .xlsx Excel file.")
        
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        
    try:
        if ext == "csv":
            try:
                df = pd.read_csv(io.BytesIO(contents), encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(contents), encoding="latin1")
        else:
            df = pd.read_excel(io.BytesIO(contents), engine="openpyxl")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse spreadsheet file: {str(e)}")
        
    df = df.where(pd.notnull(df), None)
    total_rows = len(df)
    columns = [str(c).strip() for c in df.columns]
    
    # Preview up to 10 rows
    preview_df = df.head(10)
    preview_rows = preview_df.to_dict(orient="records")
    
    suggested = _suggest_mapping(columns)
    
    return UploadPreviewResponse(
        filename=filename,
        file_type="excel" if ext in ["xlsx", "xls"] else "csv",
        total_rows=total_rows,
        detected_columns=columns,
        preview_rows=preview_rows,
        suggested_mapping=suggested
    )

def _parse_file_to_rows(contents: bytes, filename: str) -> tuple[int, List[str], List[Dict[str, Any]]]:
    """Parse CSV or Excel file completely into column list and raw records dictionary."""
    ext = filename.split(".")[-1].lower()
    if ext == "csv":
        try:
            df = pd.read_csv(io.BytesIO(contents), encoding="utf-8")
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(contents), encoding="latin1")
    elif ext in ["xlsx", "xls"]:
        df = pd.read_excel(io.BytesIO(contents), engine="openpyxl")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a .csv or .xlsx Excel file.")
    
    df = df.where(pd.notnull(df), None)
    total_rows = len(df)
    columns = [str(c).strip() for c in df.columns]
    rows = df.to_dict(orient="records")
    return total_rows, columns, rows

def _validate_mapped_row(
    row: Dict[str, Any],
    mapping: Dict[str, str],
    cfg,
    existing_ids: set,
    seen_in_batch: set,
    row_idx: int,
    duplicate_policy: str = "skip"
) -> tuple[Optional[Dict[str, Any]], List[RowValidationError], bool]:
    """Validate a single row against mapped fields and return (clean_record, errors, is_update)."""
    errors = []
    is_update = False
    
    def get_val(app_field):
        src_col = mapping.get(app_field)
        if not src_col or src_col not in row:
            return None
        val = row[src_col]
        if val is None or (isinstance(val, str) and val.strip() == ""):
            return None
        return val

    # 1. Student ID
    raw_id = get_val("student_id")
    stu_id = str(raw_id).strip() if raw_id is not None else ""
    if not stu_id:
        errors.append(RowValidationError(row_index=row_idx, student_id=None, field="student_id", message="Student ID is required.", value=raw_id))
    elif stu_id in seen_in_batch:
        errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="student_id", message=f"Duplicate Student ID '{stu_id}' found multiple times in uploaded file.", value=stu_id))
    elif stu_id in existing_ids:
        if duplicate_policy == "reject":
            errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="student_id", message=f"Student ID '{stu_id}' already exists in this dataset (Policy: Reject).", value=stu_id))
        elif duplicate_policy == "update":
            is_update = True
        else: # "skip"
            return None, [], False
    else:
        seen_in_batch.add(stu_id)

    # 2. Student Name
    raw_name = get_val("student_name")
    stu_name = str(raw_name).strip() if raw_name is not None else ""
    if not stu_name:
        errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="student_name", message="Student name is required.", value=raw_name))

    # 3. Department & Course & Semester
    raw_dept = get_val("department")
    dept = str(raw_dept).strip() if raw_dept is not None else "Computer Science"
    
    raw_course = get_val("course_name")
    course = str(raw_course).strip() if raw_course is not None else "Core Curriculum"
    
    raw_sem = get_val("semester")
    sem = str(raw_sem).strip() if raw_sem is not None else "Semester 1"

    # 4. Attendance Percentage
    raw_att = get_val("attendance_percentage")
    att = 85.0
    if raw_att is not None:
        try:
            att = float(str(raw_att).replace("%", "").strip())
            if att < 0.0 or att > 100.0:
                errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="attendance_percentage", message=f"Attendance percentage must be between 0.0 and 100.0 (got {att}).", value=raw_att))
        except ValueError:
            errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="attendance_percentage", message="Invalid numeric value for attendance percentage.", value=raw_att))
    else:
        errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="attendance_percentage", message="Attendance percentage is required.", value=None))

    # 5. Internal Marks
    raw_int = get_val("internal_marks")
    internal = 0.0
    if raw_int is not None:
        try:
            internal = float(raw_int)
            if internal < 0.0:
                errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="internal_marks", message="Internal marks cannot be negative.", value=raw_int))
            elif internal > cfg.max_internal_marks:
                errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="internal_marks", message=f"Internal marks ({internal}) exceed configured maximum ({cfg.max_internal_marks}).", value=raw_int))
        except ValueError:
            errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="internal_marks", message="Invalid numeric value for internal marks.", value=raw_int))
    else:
        errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="internal_marks", message="Internal marks are required.", value=None))

    # 6. Previous Score
    raw_prev = get_val("previous_score")
    prev_score = 0.0
    if raw_prev is not None:
        try:
            prev_score = float(raw_prev)
            if prev_score < 0.0:
                errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="previous_score", message="Previous score cannot be negative.", value=raw_prev))
            elif prev_score > cfg.max_previous_score:
                errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="previous_score", message=f"Previous score ({prev_score}) exceeds configured maximum ({cfg.max_previous_score}).", value=raw_prev))
        except ValueError:
            errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="previous_score", message="Invalid numeric value for previous score.", value=raw_prev))
    else:
        errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="previous_score", message="Previous score is required.", value=None))

    # 7. Assignment Marks
    raw_assign = get_val("assignment_marks")
    assignment = 0.0
    if raw_assign is not None:
        try:
            assignment = float(raw_assign)
            if assignment < 0.0:
                errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="assignment_marks", message="Assignment marks cannot be negative.", value=raw_assign))
            elif assignment > cfg.max_assignment_marks:
                errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="assignment_marks", message=f"Assignment marks ({assignment}) exceed configured maximum ({cfg.max_assignment_marks}).", value=raw_assign))
        except ValueError:
            errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="assignment_marks", message="Invalid numeric value for assignment marks.", value=raw_assign))

    # 8. Study Hours & Failures
    raw_hours = get_val("study_hours_per_week")
    study_hours = 5.0
    if raw_hours is not None:
        try:
            study_hours = float(raw_hours)
            if study_hours < 0.0:
                errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="study_hours_per_week", message="Study hours cannot be negative.", value=raw_hours))
        except ValueError:
            errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="study_hours_per_week", message="Invalid numeric study hours.", value=raw_hours))

    raw_fail = get_val("failures")
    failures = 0
    if raw_fail is not None:
        try:
            failures = int(float(raw_fail))
            if failures < 0 or failures > 4:
                errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="failures", message="Failures must be between 0 and 4.", value=raw_fail))
        except ValueError:
            errors.append(RowValidationError(row_index=row_idx, student_id=stu_id, field="failures", message="Invalid integer for failures.", value=raw_fail))

    # 9. Observed final score
    raw_obs = get_val("observed_final_score")
    observed_score = None
    if raw_obs is not None:
        try:
            observed_score = float(raw_obs)
        except ValueError:
            pass

    if errors:
        return None, errors, False

    clean_record = {
        "student_id": stu_id,
        "student_name": stu_name,
        "email": str(get_val("email")).strip() if get_val("email") else None,
        "department": dept,
        "course_name": course,
        "semester": sem,
        "academic_year": str(get_val("academic_year")).strip() if get_val("academic_year") else "2024-2025",
        "attendance_percentage": att,
        "previous_score": prev_score,
        "max_previous_score": cfg.max_previous_score,
        "internal_marks": internal,
        "max_internal_marks": cfg.max_internal_marks,
        "assignment_marks": assignment,
        "max_assignment_marks": cfg.max_assignment_marks,
        "study_hours_per_week": study_hours,
        "failures": failures,
        "observed_final_score": observed_score
    }
    return clean_record, [], is_update

@router.post("/datasets/validate-file", response_model=ValidationResponse)
async def validate_dataset_file(
    file: UploadFile = File(...),
    dataset_id: int = Form(1),
    column_mapping: Optional[str] = Form(None),
    assessment_config: Optional[str] = Form(None),
    duplicate_policy: str = Form("skip")
):
    """Validate all rows from uploaded CSV or Excel file against mapping and assessment rules."""
    contents = await file.read()
    total_rows, columns, rows = _parse_file_to_rows(contents, file.filename or "upload.csv")
    
    if column_mapping and column_mapping.strip() not in ["", "{}"]:
        try:
            mapping = json.loads(column_mapping)
        except Exception:
            mapping = {c: c for c in columns}
    else:
        mapping = {c: c for c in columns}

    if assessment_config and assessment_config.strip() not in ["", "{}"]:
        try:
            cfg_dict = json.loads(assessment_config)
            cfg = AssessmentConfig(**cfg_dict)
        except Exception:
            cfg = AssessmentConfig(max_internal_marks=100.0, max_previous_score=100.0, max_assignment_marks=100.0)
    else:
        cfg = AssessmentConfig(max_internal_marks=100.0, max_previous_score=100.0, max_assignment_marks=100.0)
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT student_id FROM institution_students WHERE dataset_id = ?", (dataset_id,))
        existing_ids = {r["student_id"] for r in cursor.fetchall()}

    seen_in_batch = set()
    all_errors = []
    valid_records = []
    
    for idx, row in enumerate(rows):
        clean_rec, errs, _ = _validate_mapped_row(
            row=row,
            mapping=mapping,
            cfg=cfg,
            existing_ids=existing_ids,
            seen_in_batch=seen_in_batch,
            row_idx=idx + 1,
            duplicate_policy=duplicate_policy
        )
        if errs:
            all_errors.extend(errs)
        elif clean_rec:
            valid_records.append(clean_rec)
            
    return ValidationResponse(
        total_records=total_rows,
        valid_records=len(valid_records),
        invalid_records=total_rows - len(valid_records),
        errors=all_errors[:50],
        preview_mapped_rows=valid_records[:5]
    )

@router.post("/datasets/import-file", response_model=ImportResponse)
async def import_dataset_file(
    file: UploadFile = File(...),
    dataset_id: int = Form(...),
    column_mapping: Optional[str] = Form(None),
    assessment_config: Optional[str] = Form(None),
    skip_invalid: bool = Form(True),
    duplicate_policy: str = Form("skip")
):
    """Import all validated rows from uploaded spreadsheet directly into SQLite in a single transaction."""
    contents = await file.read()
    filename = file.filename or "upload.csv"
    total_rows, columns, rows = _parse_file_to_rows(contents, filename)
    
    if column_mapping and column_mapping.strip() not in ["", "{}"]:
        try:
            mapping = json.loads(column_mapping)
        except Exception:
            mapping = {c: c for c in columns}
    else:
        mapping = {c: c for c in columns}

    if assessment_config and assessment_config.strip() not in ["", "{}"]:
        try:
            cfg_dict = json.loads(assessment_config)
            cfg = AssessmentConfig(**cfg_dict)
        except Exception:
            cfg = AssessmentConfig(max_internal_marks=100.0, max_previous_score=100.0, max_assignment_marks=100.0)
    else:
        cfg = AssessmentConfig(max_internal_marks=100.0, max_previous_score=100.0, max_assignment_marks=100.0)
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM datasets WHERE id = ?", (dataset_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Target dataset not found.")
            
        cursor.execute("SELECT student_id FROM institution_students WHERE dataset_id = ?", (dataset_id,))
        existing_ids = {r["student_id"] for r in cursor.fetchall()}

        seen_in_batch = set()
        all_errors = []
        valid_records = []
        
        for idx, row in enumerate(rows):
            clean_rec, errs, is_up = _validate_mapped_row(
                row=row,
                mapping=mapping,
                cfg=cfg,
                existing_ids=existing_ids,
                seen_in_batch=seen_in_batch,
                row_idx=idx + 1,
                duplicate_policy=duplicate_policy
            )
            if errs:
                all_errors.extend(errs)
            elif clean_rec:
                valid_records.append((clean_rec, is_up))
                
        if duplicate_policy == "reject" and any(e.message and "Policy: Reject" in e.message for e in all_errors):
            first_err = next(e for e in all_errors if "Policy: Reject" in e.message)
            raise HTTPException(
                status_code=400,
                detail=f"Duplicate student ID detected: {first_err.message}"
            )

        if not skip_invalid and len(all_errors) > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Validation errors detected in {len(all_errors)} records. Import aborted (skip_invalid is False)."
            )
            
        now_iso = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        imported_count = 0
        
        for rec, is_up in valid_records:
            obs_at_risk = 1 if (rec["observed_final_score"] is not None and rec["observed_final_score"] < 10.0) else (0 if rec["observed_final_score"] is not None else None)
            if is_up:
                cursor.execute("""
                    UPDATE institution_students SET
                        student_name = ?, email = ?, department = ?, course_name = ?, semester = ?,
                        academic_year = ?, attendance_percentage = ?, previous_score = ?, max_previous_score = ?,
                        internal_marks = ?, max_internal_marks = ?, assignment_marks = ?, max_assignment_marks = ?,
                        study_hours_per_week = ?, failures = ?, observed_final_score = ?, observed_at_risk = ?,
                        updated_at = ?
                    WHERE dataset_id = ? AND student_id = ?
                """, (
                    rec["student_name"], rec["email"], rec["department"], rec["course_name"], rec["semester"],
                    rec["academic_year"], rec["attendance_percentage"], rec["previous_score"], rec["max_previous_score"],
                    rec["internal_marks"], rec["max_internal_marks"], rec["assignment_marks"], rec["max_assignment_marks"],
                    rec["study_hours_per_week"], rec["failures"], rec["observed_final_score"], obs_at_risk,
                    now_iso, dataset_id, rec["student_id"]
                ))
            else:
                cursor.execute("""
                    INSERT INTO institution_students (
                        dataset_id, student_id, student_name, email, department,
                        course_name, semester, academic_year, attendance_percentage,
                        previous_score, max_previous_score, internal_marks, max_internal_marks,
                        assignment_marks, max_assignment_marks, study_hours_per_week,
                        failures, observed_final_score, observed_at_risk, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    dataset_id, rec["student_id"], rec["student_name"], rec["email"], rec["department"],
                    rec["course_name"], rec["semester"], rec["academic_year"], rec["attendance_percentage"],
                    rec["previous_score"], rec["max_previous_score"], rec["internal_marks"], rec["max_internal_marks"],
                    rec["assignment_marks"], rec["max_assignment_marks"], rec["study_hours_per_week"],
                    rec["failures"], rec["observed_final_score"], obs_at_risk, now_iso, now_iso
                ))
            imported_count += 1
            
        skipped_count = total_rows - imported_count
        
        # Log into dataset_imports
        error_summary = [
            {"row": e.row_index, "student_id": e.student_id, "field": e.field, "error": e.message}
            for e in all_errors[:100]
        ]
        cursor.execute("""
            INSERT INTO dataset_imports (
                dataset_id, filename, total_rows, imported_rows, skipped_rows, error_log, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            dataset_id, filename, total_rows, imported_count, skipped_count,
            json.dumps(error_summary) if error_summary else None, now_iso
        ))
        
        return ImportResponse(
            dataset_id=dataset_id,
            total_processed=total_rows,
            imported_count=imported_count,
            skipped_count=skipped_count,
            errors=all_errors[:50]
        )

@router.post("/datasets/validate", response_model=ValidationResponse)
def validate_dataset_upload(payload: ValidationRequest):
    """Validate all rows against column mapping and assessment constraints without writing to DB."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT student_id FROM institution_students WHERE dataset_id = ?", (payload.dataset_id,))
        existing_ids = {r["student_id"] for r in cursor.fetchall()}

    seen_in_batch = set()
    all_errors = []
    valid_records = []
    dup_policy = payload.duplicate_policy or "skip"
    
    for idx, row in enumerate(payload.rows):
        clean_rec, errs, _ = _validate_mapped_row(
            row=row,
            mapping=payload.column_mapping,
            cfg=payload.assessment_config,
            existing_ids=existing_ids,
            seen_in_batch=seen_in_batch,
            row_idx=idx + 1,
            duplicate_policy=dup_policy
        )
        if errs:
            all_errors.extend(errs)
        else:
            valid_records.append(clean_rec)
            
    return ValidationResponse(
        total_records=len(payload.rows),
        valid_records=len(valid_records),
        invalid_records=len(payload.rows) - len(valid_records),
        errors=all_errors[:50],
        preview_mapped_rows=valid_records[:5]
    )

@router.post("/datasets/import", response_model=ImportResponse)
def import_dataset(payload: ImportRequest):
    """
    Import validated spreadsheet records into the institution_students database table.
    Enforces transaction atomicity and writes import log history.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Check target dataset exists
        cursor.execute("SELECT id FROM datasets WHERE id = ?", (payload.dataset_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Target dataset not found.")
            
        cursor.execute("SELECT student_id FROM institution_students WHERE dataset_id = ?", (payload.dataset_id,))
        existing_ids = {r["student_id"] for r in cursor.fetchall()}

        seen_in_batch = set()
        all_errors = []
        valid_records = []
        dup_policy = payload.duplicate_policy or "skip"
        
        for idx, row in enumerate(payload.rows):
            clean_rec, errs, is_up = _validate_mapped_row(
                row=row,
                mapping=payload.column_mapping,
                cfg=payload.assessment_config,
                existing_ids=existing_ids,
                seen_in_batch=seen_in_batch,
                row_idx=idx + 1,
                duplicate_policy=dup_policy
            )
            if errs:
                all_errors.extend(errs)
            else:
                valid_records.append((clean_rec, is_up))
                
        if not payload.skip_invalid and len(all_errors) > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Validation errors detected in {len(all_errors)} fields. Import aborted (skip_invalid is False)."
            )
            
        now_iso = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        imported_count = 0
        
        for rec, is_up in valid_records:
            observed_at_risk = None
            if rec["observed_final_score"] is not None:
                observed_at_risk = 1 if rec["observed_final_score"] < 10.0 else 0
                
            if is_up:
                cursor.execute("""
                    UPDATE institution_students SET
                        student_name = ?, email = ?, department = ?, course_name = ?, semester = ?,
                        academic_year = ?, attendance_percentage = ?, previous_score = ?, max_previous_score = ?,
                        internal_marks = ?, max_internal_marks = ?, assignment_marks = ?, max_assignment_marks = ?,
                        study_hours_per_week = ?, failures = ?, observed_final_score = ?, observed_at_risk = ?,
                        updated_at = ?
                    WHERE dataset_id = ? AND student_id = ?
                """, (
                    rec["student_name"], rec["email"], rec["department"], rec["course_name"], rec["semester"],
                    rec["academic_year"], rec["attendance_percentage"], rec["previous_score"], rec["max_previous_score"],
                    rec["internal_marks"], rec["max_internal_marks"], rec["assignment_marks"], rec["max_assignment_marks"],
                    rec["study_hours_per_week"], rec["failures"], rec["observed_final_score"], observed_at_risk,
                    now_iso, payload.dataset_id, rec["student_id"]
                ))
            else:
                cursor.execute("""
                    INSERT INTO institution_students (
                        dataset_id, student_id, student_name, email, department,
                        course_name, semester, academic_year, attendance_percentage,
                        previous_score, max_previous_score, internal_marks, max_internal_marks,
                        assignment_marks, max_assignment_marks, study_hours_per_week,
                        failures, observed_final_score, observed_at_risk, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    payload.dataset_id,
                    rec["student_id"],
                    rec["student_name"],
                    rec["email"],
                    rec["department"],
                    rec["course_name"],
                    rec["semester"],
                    rec["academic_year"],
                    rec["attendance_percentage"],
                    rec["previous_score"],
                    rec["max_previous_score"],
                    rec["internal_marks"],
                    rec["max_internal_marks"],
                    rec["assignment_marks"],
                    rec["max_assignment_marks"],
                    rec["study_hours_per_week"],
                    rec["failures"],
                    rec["observed_final_score"],
                    observed_at_risk,
                    now_iso,
                    now_iso
                ))
            imported_count += 1
            
        skipped_count = len(payload.rows) - imported_count
        
        # Log into dataset_imports
        error_summary = [
            {"row": e.row_index, "student_id": e.student_id, "field": e.field, "error": e.message}
            for e in all_errors[:100]
        ]
        cursor.execute("""
            INSERT INTO dataset_imports (
                dataset_id, filename, total_rows, imported_rows, skipped_rows, error_log, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            payload.dataset_id,
            payload.filename,
            len(payload.rows),
            imported_count,
            skipped_count,
            json.dumps(error_summary) if error_summary else None,
            now_iso
        ))
        
        return ImportResponse(
            dataset_id=payload.dataset_id,
            total_processed=len(payload.rows),
            imported_count=imported_count,
            skipped_count=skipped_count,
            errors=all_errors[:50]
        )

@router.get("/datasets/template")
def download_csv_template():
    """Download a standardized CSV template pre-populated with example college student records."""
    headers = [
        "student_id", "student_name", "email", "department", "course_name", "semester",
        "attendance_percentage", "internal_marks", "previous_score", "assignment_marks",
        "study_hours_per_week", "failures", "observed_final_score"
    ]
    sample_rows = [
        ["STU-2024-001", "Aarav Sharma", "aarav.s@college.edu", "Computer Science", "Data Structures", "Semester 5", 92.5, 23.0, 88.0, 24.0, 8.5, 0, ""],
        ["STU-2024-002", "Priya Nair", "priya.n@college.edu", "Information Technology", "Database Systems", "Semester 5", 68.0, 11.5, 54.0, 12.0, 2.0, 1, ""],
        ["STU-2024-003", "Rohan Mehta", "rohan.m@college.edu", "Electronics & Comm", "Signal Processing", "Semester 5", 81.0, 17.5, 72.0, 18.0, 5.0, 0, ""]
    ]
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(sample_rows)
    output.seek(0)
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=college_students_import_template.csv"}
    )

@router.get("/datasets/{dataset_id}/export")
def export_college_students_csv(dataset_id: int):
    """Export all students in a dataset along with composite score and latest prediction to CSV."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM datasets WHERE id = ?", (dataset_id,))
        d_row = cursor.fetchone()
        dataset_name = d_row["name"] if d_row else f"dataset_{dataset_id}"
        
        cursor.execute("""
            SELECT s.*, 
                   lp.predicted_outcome, lp.risk_probability, lp.predicted_grade,
                   lp.risk_tier, lp.confidence_level
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
            ORDER BY s.id ASC
        """, (dataset_id,))
        rows = cursor.fetchall()
        
    output = io.StringIO()
    writer = csv.writer(output)
    
    headers = [
        "student_id", "student_name", "email", "department", "course_name", "semester", "academic_year",
        "attendance_percentage", "internal_marks", "max_internal_marks", "previous_score", "max_previous_score",
        "assignment_marks", "max_assignment_marks", "study_hours_per_week", "failures",
        "scaled_g1_score", "calculated_absences", "observed_final_score",
        "predicted_outcome", "predicted_risk_tier", "risk_probability", "predicted_grade", "confidence_level"
    ]
    writer.writerow(headers)
    
    for r in rows:
        g1 = calculate_scaled_g1(
            internal=float(r["internal_marks"]),
            max_internal=float(r["max_internal_marks"]),
            previous_score=float(r["previous_score"]),
            max_previous=float(r["max_previous_score"]),
            assignment=float(r["assignment_marks"]),
            max_assignment=float(r["max_assignment_marks"])
        )
        absences = calculate_absences_from_attendance(float(r["attendance_percentage"]))
        
        writer.writerow([
            r["student_id"],
            r["student_name"],
            r["email"] or "",
            r["department"],
            r["course_name"],
            r["semester"],
            r["academic_year"] or "",
            r["attendance_percentage"],
            r["internal_marks"],
            r["max_internal_marks"],
            r["previous_score"],
            r["max_previous_score"],
            r["assignment_marks"],
            r["max_assignment_marks"],
            r["study_hours_per_week"],
            r["failures"],
            g1,
            absences,
            r["observed_final_score"] if r["observed_final_score"] is not None else "",
            r["predicted_outcome"] or "Not Scored",
            r["risk_tier"] or "Not Scored",
            r["risk_probability"] if r["risk_probability"] is not None else "",
            r["predicted_grade"] if r["predicted_grade"] is not None else "",
            r["confidence_level"] or ""
        ])
        
    output.seek(0)
    clean_filename = "".join(c if c.isalnum() else "_" for c in dataset_name).strip("_")
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={clean_filename}_students.csv"}
    )

@router.get("/datasets/{dataset_id}/imports")
def get_dataset_import_logs(dataset_id: int):
    """Retrieve spreadsheet import history and logs for a dataset."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM dataset_imports 
            WHERE dataset_id = ? 
            ORDER BY id DESC
        """, (dataset_id,))
        rows = cursor.fetchall()
        
        logs = []
        for r in rows:
            logs.append({
                "id": r["id"],
                "dataset_id": r["dataset_id"],
                "filename": r["filename"],
                "total_rows": r["total_rows"],
                "imported_rows": r["imported_rows"],
                "skipped_rows": r["skipped_rows"],
                "error_log": json.loads(r["error_log"]) if r["error_log"] else [],
                "created_at": r["created_at"]
            })
        return logs
