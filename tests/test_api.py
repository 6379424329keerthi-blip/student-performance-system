"""
Automated Test Suite for FastAPI Backend Endpoints
Smart Student Performance Prediction and Analytics System
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_api_health():
    """Verify system health endpoint status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["model_status"]["loaded"] is True
    assert data["database_status"]["connected"] is True

def test_api_overview():
    """Verify overview KPIs."""
    response = client.get("/api/overview")
    assert response.status_code == 200
    data = response.json()
    assert "kpi_cards" in data
    assert data["kpi_cards"]["total_records"] == 1044
    assert data["kpi_cards"]["unique_students"] == 662
    assert data["kpi_cards"]["models_evaluated_count"] == 5
    assert data["kpi_cards"]["best_model_recall"] >= 90.0

def test_api_dataset_summary():
    """Verify dataset summary and zero missing values."""
    response = client.get("/api/dataset/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["dimensions"]["total_records"] == 1044
    assert data["missing_values_audit"]["total_missing"] == 0
    assert data["missing_values_audit"]["completeness_percentage"] == 100.0

def test_api_dataset_records_pagination():
    """Verify filterable dataset records endpoint with pagination."""
    response = client.get("/api/dataset/records?page=1&limit=15&course=Math")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["limit"] == 15
    assert len(data["records"]) == 15
    assert all(r["course"] == "Math" for r in data["records"])

def test_api_models_comparison():
    """Verify model comparison table returns all 5 classification models."""
    response = client.get("/api/models/comparison")
    assert response.status_code == 200
    data = response.json()
    assert len(data["classification_comparison"]) == 5
    model_names = [m["model_name"] for m in data["classification_comparison"]]
    assert any("Dummy" in name for name in model_names)
    assert any("RandomForest" in name for name in model_names)
    assert any("LogisticRegression" in name for name in model_names)

def test_api_models_feature_importance():
    """Verify feature importance endpoint returns top features."""
    response = client.get("/api/models/feature-importance")
    assert response.status_code == 200
    data = response.json()
    assert "top_features" in data
    assert len(data["top_features"]) > 0
    assert data["top_features"][0]["importance"] > 0

def test_api_predict_valid_student():
    """Verify inference endpoint returns complete prediction schema and SHAP explanations."""
    payload = {
        "student_identifier": "TEST_STU_HIGH_RISK",
        "course": "Math",
        "G1": 6.0,  # Weak mid-term grade
        "failures": 2,  # Past failures
        "absences": 12,  # High absences
        "studytime": 1,  # <2 hrs study
        "schoolsup": "no",
        "famsup": "no",
        "paid": "no",
        "higher": "no",
        "school": "GP",
        "sex": "M",
        "age": 18,
        "address": "R",
        "famsize": "GT3",
        "Pstatus": "A",
        "Medu": 1,
        "Fedu": 1,
        "Mjob": "other",
        "Fjob": "other",
        "reason": "course",
        "guardian": "other",
        "traveltime": 2,
        "activities": "no",
        "nursery": "no",
        "internet": "no",
        "romantic": "yes",
        "famrel": 3,
        "freetime": 4,
        "goout": 4,
        "Dalc": 3,
        "Walc": 4,
        "health": 3
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["student_identifier"] == "TEST_STU_HIGH_RISK"
    assert data["predicted_at_risk"] in [0, 1]
    assert 0.0 <= data["risk_probability"] <= 1.0
    assert 0.0 <= data["predicted_grade"] <= 20.0
    assert data["risk_tier"] in ["High Risk", "Moderate Risk", "Low Risk"]
    assert len(data["contributing_factors"]) > 0
    assert len(data["supportive_recommendations"]) > 0

def test_api_predict_invalid_inputs_validation():
    """Verify Pydantic input validation rejects out-of-range inputs with HTTP 422."""
    invalid_payload = {
        "course": "InvalidSubject",  # Must be Math or Portuguese
        "G1": 99.0,  # Out of range (0-20)
        "age": 45    # Out of range (15-22)
    }
    response = client.post("/api/predict", json=invalid_payload)
    assert response.status_code == 422, "Expected 422 Unprocessable Entity for invalid feature bounds"

def test_api_predictions_history():
    """Verify saved prediction records appear in SQLite history."""
    response = client.get("/api/predictions?page=1&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "records" in data
    assert data["total_records"] >= 1
    
    # Detail check
    first_id = data["records"][0]["id"]
    detail_res = client.get(f"/api/predictions/{first_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["prediction_id"] == first_id
    assert "input_features" in detail
    assert "contributing_factors" in detail
    assert "supportive_recommendations" in detail

def test_api_error_states_and_handling():
    """
    SECTION 16 CHECK: Frontend/API error state validation.
    Verifies 404 handling on non-existent prediction IDs.
    """
    response = client.get("/api/predictions/9999999")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data

def test_api_reports_summary_and_export():
    """Verify report summary and CSV export endpoints."""
    res_summary = client.get("/api/reports/summary")
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert "project_title" in summary
    assert "ml_methodology" in summary

    res_export = client.get("/api/reports/export?format=csv")
    assert res_export.status_code == 200
    assert "text/csv" in res_export.headers.get("content-type", "")
    assert len(res_export.text) > 50
