import io
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_list_and_create_datasets():
    # 1. List existing datasets
    res = client.get("/api/college/datasets")
    assert res.status_code == 200
    datasets = res.json()
    assert isinstance(datasets, list)
    assert len(datasets) >= 1
    
    # 2. Create a new custom cohort
    payload = {
        "name": "B.Tech AI & Data Science Cohort 2024",
        "description": "3rd Year Undergraduate Cohort",
        "department": "Artificial Intelligence",
        "semester": "Semester 5",
        "academic_year": "2024-2025"
    }
    create_res = client.post("/api/college/datasets", json=payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["name"] == payload["name"]
    assert created_data["student_count"] == 0
    new_id = created_data["id"]

    # 3. Clean up custom dataset
    del_res = client.delete(f"/api/college/datasets/{new_id}")
    assert del_res.status_code == 200

def test_manual_student_creation_and_validation():
    # Fetch default dataset ID
    ds_res = client.get("/api/college/datasets")
    dataset_id = ds_res.json()[0]["id"]
    
    student_payload = {
        "dataset_id": dataset_id,
        "student_id": "TEST_STU_001",
        "student_name": "Kavya Ramesh",
        "email": "kavya.r@college.edu",
        "department": "Computer Science",
        "course_name": "Data Structures & Algorithms",
        "semester": "Semester 3",
        "academic_year": "2024-2025",
        "attendance_percentage": 94.0,
        "previous_score": 85.0,
        "max_previous_score": 100.0,
        "internal_marks": 22.0,
        "max_internal_marks": 25.0,
        "assignment_marks": 24.0,
        "max_assignment_marks": 25.0,
        "study_hours_per_week": 8.0,
        "failures": 0
    }
    
    # Clean up if already exists from prior test runs
    client.delete(f"/api/college/students/{student_payload['student_id']}")
    
    # 1. Valid Student Creation
    res = client.post("/api/college/students", json=student_payload)
    assert res.status_code == 201, res.text
    stu_data = res.json()
    assert stu_data["student_id"] == "TEST_STU_001"
    assert stu_data["scaled_g1_score"] > 0
    student_pk = stu_data["id"]

    # 2. Duplicate Student ID rejection
    dup_res = client.post("/api/college/students", json=student_payload)
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

    # 3. Invalid Marks: Internal marks exceed maximum
    invalid_marks_payload = dict(student_payload)
    invalid_marks_payload["student_id"] = "TEST_STU_INV1"
    invalid_marks_payload["internal_marks"] = 35.0  # max is 25.0
    inv_res1 = client.post("/api/college/students", json=invalid_marks_payload)
    assert inv_res1.status_code == 422

    # 4. Invalid Attendance: Out of bounds (>100 or <0)
    invalid_att_payload = dict(student_payload)
    invalid_att_payload["student_id"] = "TEST_STU_INV2"
    invalid_att_payload["attendance_percentage"] = 115.0
    inv_res2 = client.post("/api/college/students", json=invalid_att_payload)
    assert inv_res2.status_code == 422

    # 5. Invalid Failures (>4)
    invalid_fail_payload = dict(student_payload)
    invalid_fail_payload["student_id"] = "TEST_STU_INV3"
    invalid_fail_payload["failures"] = 7
    inv_res3 = client.post("/api/college/students", json=invalid_fail_payload)
    assert inv_res3.status_code == 422

    # 6. Update Student
    up_res = client.put(f"/api/college/students/{student_pk}", json={
        "internal_marks": 24.0,
        "study_hours_per_week": 12.0
    })
    assert up_res.status_code == 200
    assert up_res.json()["internal_marks"] == 24.0
    assert up_res.json()["study_hours_per_week"] == 12.0

    # 7. Delete Student
    del_res = client.delete(f"/api/college/students/{student_pk}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

def test_template_download():
    res = client.get("/api/college/datasets/template")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    content = res.text
    assert "student_id,student_name,email" in content
    assert "STU-2024-001" in content

def test_spreadsheet_preview_and_validation():
    csv_content = """roll_no,full_name,email,branch,subject,term,attendance_pct,internal,prev_score,assignment,study_hours,backlogs
STU_PREV_01,Amit Verma,amit@col.edu,CSE,Operating Systems,Sem 4,88.0,20.0,80.0,22.0,6.0,0
STU_PREV_02,Neha Gupta,neha@col.edu,CSE,Operating Systems,Sem 4,62.0,12.0,55.0,14.0,2.5,1
"""
    # Preview
    preview_res = client.post(
        "/api/college/datasets/preview",
        files={"file": ("students.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    )
    assert preview_res.status_code == 200
    data = preview_res.json()
    assert data["total_rows"] == 2
    assert "roll_no" in data["detected_columns"]
    # Check heuristic mapping
    mapping = data["suggested_mapping"]
    assert mapping["student_id"] == "roll_no"
    assert mapping["student_name"] == "full_name"
    assert mapping["department"] == "branch"
    assert mapping["attendance_percentage"] == "attendance_pct"

    # Validation
    val_payload = {
        "dataset_id": 1,
        "rows": data["preview_rows"],
        "column_mapping": mapping,
        "assessment_config": {
            "max_internal_marks": 25.0,
            "max_previous_score": 100.0,
            "max_assignment_marks": 25.0
        }
    }
    val_res = client.post("/api/college/datasets/validate", json=val_payload)
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["total_records"] == 2
    assert val_data["valid_records"] == 2
    assert val_data["invalid_records"] == 0

def test_import_and_batch_predict_and_analytics():
    # 1. Create a dedicated test cohort
    ds_res = client.post("/api/college/datasets", json={
        "name": "Automated Test Cohort",
        "description": "Created for integration tests",
        "department": "Information Science",
        "semester": "Semester 4",
        "academic_year": "2024-2025"
    })
    assert ds_res.status_code == 201
    test_ds_id = ds_res.json()["id"]

    try:
        # 2. Import 3 students (1 high-achiever, 1 at-risk, 1 moderate)
        import_payload = {
            "dataset_id": test_ds_id,
            "filename": "test_cohort.csv",
            "rows": [
                {
                    "id": "TC_001",
                    "name": "Siddharth Rao",
                    "email": "sid@test.edu",
                    "dept": "Information Science",
                    "course": "Database Systems",
                    "sem": "Semester 4",
                    "att": 95.0,
                    "cie": 24.0,
                    "prev": 90.0,
                    "assign": 25.0,
                    "hours": 10.0,
                    "backlogs": 0
                },
                {
                    "id": "TC_002",
                    "name": "Ananya Sen",
                    "email": "ananya@test.edu",
                    "dept": "Information Science",
                    "course": "Database Systems",
                    "sem": "Semester 4",
                    "att": 60.0,
                    "cie": 8.0,
                    "prev": 42.0,
                    "assign": 10.0,
                    "hours": 1.5,
                    "backlogs": 2
                },
                {
                    "id": "TC_003",
                    "name": "Vikram Patel",
                    "email": "vikram@test.edu",
                    "dept": "Information Science",
                    "course": "Database Systems",
                    "sem": "Semester 4",
                    "att": 80.0,
                    "cie": 16.0,
                    "prev": 70.0,
                    "assign": 18.0,
                    "hours": 4.5,
                    "backlogs": 0
                }
            ],
            "column_mapping": {
                "student_id": "id",
                "student_name": "name",
                "email": "email",
                "department": "dept",
                "course_name": "course",
                "semester": "sem",
                "attendance_percentage": "att",
                "internal_marks": "cie",
                "previous_score": "prev",
                "assignment_marks": "assign",
                "study_hours_per_week": "hours",
                "failures": "backlogs"
            },
            "assessment_config": {
                "max_internal_marks": 25.0,
                "max_previous_score": 100.0,
                "max_assignment_marks": 25.0
            },
            "skip_invalid": True
        }
        
        imp_res = client.post("/api/college/datasets/import", json=import_payload)
        assert imp_res.status_code == 200
        imp_data = imp_res.json()
        assert imp_data["imported_count"] == 3
        assert imp_data["skipped_count"] == 0

        # 3. Verify students in dataset
        stu_list_res = client.get(f"/api/college/students?dataset_id={test_ds_id}")
        assert stu_list_res.status_code == 200
        records = stu_list_res.json()["records"]
        assert len(records) == 3

        # 4. Individual ML Prediction on TC_002 (at-risk profile)
        tc_002_pk = [r["id"] for r in records if r["student_id"] == "TC_002"][0]
        pred_res = client.post(f"/api/college/students/{tc_002_pk}/predict")
        assert pred_res.status_code == 200
        pred_data = pred_res.json()
        assert "predicted_at_risk" in pred_data
        assert "risk_tier" in pred_data
        assert len(pred_data["contributing_factors"]) > 0
        assert len(pred_data["supportive_recommendations"]) > 0

        # 5. Batch Prediction on the entire dataset
        batch_res = client.post("/api/college/students/batch-predict", json={"dataset_id": test_ds_id})
        assert batch_res.status_code == 200
        batch_data = batch_res.json()
        assert batch_data["total_predicted"] == 3
        assert batch_data["high_risk_count"] >= 1  # TC_002 is high risk

        # 6. Verify Dynamic Analytics Summary
        analytics_res = client.get(f"/api/college/analytics/summary?dataset_id={test_ds_id}")
        assert analytics_res.status_code == 200
        a_data = analytics_res.json()
        assert a_data["total_students"] == 3
        assert a_data["avg_attendance"] > 0
        assert len(a_data["score_distribution"]) == 5
        assert len(a_data["attendance_brackets"]) == 3
        assert len(a_data["department_breakdown"]) == 1
        assert a_data["department_breakdown"][0]["department"] == "Information Science"

        # 7. Verify CSV Export
        export_res = client.get(f"/api/college/datasets/{test_ds_id}/export")
        assert export_res.status_code == 200
        assert "text/csv" in export_res.headers["content-type"]
        exp_lines = export_res.text.strip().split("\n")
        assert len(exp_lines) >= 4  # 1 header + 3 student rows
        assert "TC_001" in export_res.text
        assert "TC_002" in export_res.text

    finally:
        # Clean up test cohort
        client.delete(f"/api/college/datasets/{test_ds_id}")
