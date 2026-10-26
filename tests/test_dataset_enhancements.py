import os
import io
import csv
import json
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database.db import get_db_connection

client = TestClient(app)

def generate_csv_bytes(n_records: int = 500, prefix: str = "ENG") -> bytes:
    """Generate in-memory CSV with n_records using 0-100 assessment scale."""
    output = io.StringIO()
    writer = csv.writer(output)
    
    headers = [
        "student_id", "student_name", "department", "course_name", "semester",
        "internal_marks", "max_internal_marks",
        "previous_score", "max_previous_score",
        "assignment_marks", "max_assignment_marks",
        "attendance_percentage", "study_hours_per_week", "failures"
    ]
    writer.writerow(headers)
    
    departments = ["Computer Science", "Mechanical", "Electrical", "Civil", "Information Technology"]
    
    for i in range(1, n_records + 1):
        dept = departments[i % len(departments)]
        # Generate realistic values on 0-100 scale
        internal = 40.0 + (i * 17) % 58.0  # 40 to 97
        prev = 45.0 + (i * 23) % 52.0      # 45 to 96
        assign = 50.0 + (i * 13) % 48.0    # 50 to 97
        att = 65.0 + (i * 7) % 35.0        # 65 to 99%
        study = 2.0 + (i * 3) % 18.0       # 2 to 19 hrs/wk
        failures = 1 if att < 75.0 and internal < 50.0 else 0
        
        writer.writerow([
            f"{prefix}{i:04d}",
            f"Student {prefix} {i}",
            dept,
            "B.Tech Engineering",
            f"Semester {(i % 8) + 1}",
            round(internal, 1),
            100.0,
            round(prev, 1),
            100.0,
            round(assign, 1),
            100.0,
            round(att, 1),
            round(study, 1),
            failures
        ])
        
    return output.getvalue().encode("utf-8")


def test_validate_and_import_500_records_file():
    """Verify that a 500-row CSV with 0-100 scale is fully validated and imported without truncation."""
    # 1. Create a new dataset cohort
    ds_resp = client.post("/api/college/datasets", json={
        "name": "Engineering Cohort 2024-2028 (500 Students)",
        "description": "Full cohort with continuous internal assessments on 0-100 scale.",
        "department": "Engineering College",
        "semester": "Semester 3",
        "academic_year": "2024-2025"
    })
    assert ds_resp.status_code in [200, 201], ds_resp.text
    dataset_id = ds_resp.json()["id"]
    
    # 2. Generate 500-record CSV
    csv_bytes = generate_csv_bytes(n_records=500, prefix="ENG24_")
    
    # 3. Validate entire file via POST /api/college/datasets/validate-file
    files = {"file": ("students_500.csv", csv_bytes, "text/csv")}
    val_resp = client.post("/api/college/datasets/validate-file", files=files)
    assert val_resp.status_code == 200, val_resp.text
    val_data = val_resp.json()
    
    assert val_data["total_records"] == 500, f"Expected 500 records, got {val_data['total_records']}"
    assert val_data["valid_records"] == 500, f"Expected 500 valid records, got {val_data['valid_records']}"
    assert val_data["invalid_records"] == 0
    assert len(val_data["errors"]) == 0
    
    # 4. Import entire file via POST /api/college/datasets/import-file
    files = {"file": ("students_500.csv", csv_bytes, "text/csv")}
    data = {
        "dataset_id": str(dataset_id),
        "duplicate_policy": "skip"
    }
    imp_resp = client.post("/api/college/datasets/import-file", files=files, data=data)
    assert imp_resp.status_code == 200, imp_resp.text
    imp_data = imp_resp.json()
    
    assert imp_data["imported_count"] == 500, f"Expected 500 imported, got {imp_data['imported_count']}"
    assert imp_data["skipped_count"] == 0
    assert len(imp_data["errors"]) == 0
    
    # 5. Verify records in database via paginated query
    students_resp = client.get(f"/api/college/students?dataset_id={dataset_id}&page=1&limit=25")
    assert students_resp.status_code == 200
    st_data = students_resp.json()
    assert st_data["total_records"] == 500
    assert st_data["total_pages"] == 20
    assert len(st_data["records"]) == 25
    
    # Check page 20
    p20_resp = client.get(f"/api/college/students?dataset_id={dataset_id}&page=20&limit=25")
    assert p20_resp.status_code == 200
    assert len(p20_resp.json()["records"]) == 25
    
    # Verify assessment scale values
    first_stu = st_data["records"][0]
    assert first_stu["max_internal_marks"] == 100.0
    assert first_stu["max_previous_score"] == 100.0
    assert 0.0 <= first_stu["scaled_g1_score"] <= 20.0


def test_duplicate_policies_handling():
    """Verify skip, update, and reject duplicate policies on re-import."""
    # 1. Create dataset
    ds_resp = client.post("/api/college/datasets", json={
        "name": "Duplicate Policy Test Cohort",
        "description": "Testing duplicate resolution policies."
    })
    assert ds_resp.status_code in [200, 201]
    dataset_id = ds_resp.json()["id"]
    
    # Generate 20 students
    csv_bytes = generate_csv_bytes(n_records=20, prefix="DUP_")
    
    # Initial Import
    files = {"file": ("dup_test.csv", csv_bytes, "text/csv")}
    imp1 = client.post("/api/college/datasets/import-file", files=files, data={"dataset_id": str(dataset_id), "duplicate_policy": "skip"})
    assert imp1.status_code == 200
    assert imp1.json()["imported_count"] == 20
    
    # Re-import with 'skip': should skip all 20
    files = {"file": ("dup_test.csv", csv_bytes, "text/csv")}
    imp_skip = client.post("/api/college/datasets/import-file", files=files, data={"dataset_id": str(dataset_id), "duplicate_policy": "skip"})
    assert imp_skip.status_code == 200
    assert imp_skip.json()["imported_count"] == 0
    assert imp_skip.json()["skipped_count"] == 20
    
    # Re-import with 'update': should update all 20
    files = {"file": ("dup_test.csv", csv_bytes, "text/csv")}
    imp_update = client.post("/api/college/datasets/import-file", files=files, data={"dataset_id": str(dataset_id), "duplicate_policy": "update"})
    assert imp_update.status_code == 200
    assert imp_update.json()["imported_count"] == 20
    assert imp_update.json()["skipped_count"] == 0
    
    # Re-import with 'reject': should fail with 400
    files = {"file": ("dup_test.csv", csv_bytes, "text/csv")}
    imp_reject = client.post("/api/college/datasets/import-file", files=files, data={"dataset_id": str(dataset_id), "duplicate_policy": "reject"})
    assert imp_reject.status_code == 400
    assert "Duplicate student ID" in imp_reject.json()["detail"]


def test_dataset_switching_across_all_modules():
    """Test that every API module dynamically computes real metrics based on the selected dataset."""
    # 1. Create a cohort with 100 students
    ds_resp = client.post("/api/college/datasets", json={
        "name": "Switching Test Cohort (100 Students)",
        "description": "Cohort for verifying module awareness."
    })
    assert ds_resp.status_code in [200, 201]
    dataset_id = ds_resp.json()["id"]
    csv_bytes = generate_csv_bytes(n_records=100, prefix="SW100_")
    files = {"file": ("switch_test.csv", csv_bytes, "text/csv")}
    imp = client.post("/api/college/datasets/import-file", files=files, data={"dataset_id": str(dataset_id)})
    assert imp.json()["imported_count"] == 100
    
    # --- MODULE 1: OVERVIEW ---
    # Benchmark overview
    ov_bench = client.get("/api/overview?dataset_id=uci").json()
    assert ov_bench["kpi_cards"]["total_records"] == 1044
    assert ov_bench["kpi_cards"]["unique_students"] == 662
    
    # College cohort overview
    ov_college = client.get(f"/api/overview?dataset_id={dataset_id}").json()
    assert ov_college["kpi_cards"]["total_records"] == 100
    assert ov_college["kpi_cards"]["unique_students"] == 100
    assert ov_college["dataset_id"] == str(dataset_id)
    assert len(ov_college["course_breakdown"]) > 0
    
    # --- MODULE 2: DATASET SUMMARY ---
    # Benchmark summary
    ds_sum_bench = client.get("/api/dataset/summary?dataset_id=uci").json()
    assert ds_sum_bench["dimensions"]["total_records"] == 1044
    assert ds_sum_bench["dataset_id"] == "uci"
    
    # College summary
    ds_sum_college = client.get(f"/api/dataset/summary?dataset_id={dataset_id}").json()
    assert ds_sum_college["dimensions"]["total_records"] == 100
    assert ds_sum_college["dimensions"]["unique_students"] == 100
    assert "scaled_g1" in ds_sum_college["descriptive_statistics"]
    
    # --- MODULE 3: DATASET RECORDS PAGINATION ---
    rec_college = client.get(f"/api/dataset/records?dataset_id={dataset_id}&page=1&limit=20").json()
    assert rec_college["total_records"] == 100
    assert rec_college["total_pages"] == 5
    assert len(rec_college["records"]) == 20
    
    # --- MODULE 4: ANALYTICS PERFORMANCE & RISK ---
    perf_bench = client.get("/api/analytics/performance?dataset_id=uci").json()
    assert len(perf_bench["subject_summary"]) == 2  # Math & Portuguese
    
    perf_college = client.get(f"/api/analytics/performance?dataset_id={dataset_id}").json()
    assert len(perf_college["subject_summary"]) >= 4  # Engineering departments
    
    risk_college = client.get(f"/api/analytics/risk?dataset_id={dataset_id}").json()
    assert "multi_tier_distribution" in risk_college
    
    # --- MODULE 5: MODEL EVALUATION CONTEXT ---
    model_bench = client.get("/api/models?dataset_id=uci").json()
    assert "dataset_evaluation_context" not in model_bench
    
    model_college = client.get(f"/api/models?dataset_id={dataset_id}").json()
    assert "dataset_evaluation_context" in model_college
    assert model_college["dataset_evaluation_context"]["dataset_id"] == str(dataset_id)
    
    # --- MODULE 6: REPORTS SUMMARY & EXPORT ---
    rep_bench = client.get("/api/reports/summary?dataset_id=uci").json()
    assert rep_bench["dataset"]["records"] == 1044
    
    rep_college = client.get(f"/api/reports/summary?dataset_id={dataset_id}").json()
    assert rep_college["dataset"]["records"] == 100
    assert "average_attendance" in rep_college["dataset"]
    
    # Export CSV for college
    export_resp = client.get(f"/api/reports/export?format=csv&dataset_id={dataset_id}")
    assert export_resp.status_code == 200
    assert "text/csv" in export_resp.headers["content-type"]
    lines = export_resp.text.strip().split("\n")
    assert len(lines) == 101  # 1 header + 100 students


def test_zero_target_leakage_in_prediction():
    """Verify that ML prediction features are mapped safely without target leakage."""
    from backend.app.services.college_feature_mapper import (
        calculate_scaled_g1,
        calculate_absences_from_attendance,
        map_student_to_prediction_input
    )
    
    # Create sample student with known final score
    student_dict = {
        "student_id": "TEST_LEAK_01",
        "student_name": "Leakage Test Student",
        "course_name": "Data Science",
        "internal_marks": 75.0,
        "max_internal_marks": 100.0,
        "previous_score": 80.0,
        "max_previous_score": 100.0,
        "assignment_marks": 85.0,
        "max_assignment_marks": 100.0,
        "attendance_percentage": 90.0,
        "study_hours_per_week": 8.0,
        "failures": 0,
        "observed_final_score": 18.5,  # G3 ground truth
        "observed_at_risk": 0
    }
    
    pred_input = map_student_to_prediction_input(student_dict)
    
    # 1. Ensure G3 or observed_final_score is NOT a feature in pred_input
    features_dict = pred_input.model_dump()
    assert "G3" not in features_dict
    assert "observed_final_score" not in features_dict
    assert "at_risk" not in features_dict
    assert "observed_at_risk" not in features_dict
    
    # 2. Check scaled G1 is between 0 and 20
    assert 0.0 <= pred_input.G1 <= 20.0
    # Expected: (0.50 * 0.75) + (0.35 * 0.80) + (0.15 * 0.85) = 0.375 + 0.28 + 0.1275 = 0.7825 * 20 = 15.65 -> 15.6 or 15.7
    assert 15.0 <= pred_input.G1 <= 16.5
    
    # 3. Check calculated absences: 90% attendance -> 10% missed of 40 = 4 absences
    assert pred_input.absences == 4


def test_system_benchmark_deletion_protection():
    """Verify that UCI benchmark cannot be deleted."""
    resp = client.delete("/api/college/datasets/0")
    assert resp.status_code in [400, 404]
    
    # Deleting custom dataset is allowed
    ds = client.post("/api/college/datasets", json={"name": "Temp Delete Dataset"}).json()
    del_resp = client.delete(f"/api/college/datasets/{ds['id']}")
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True
