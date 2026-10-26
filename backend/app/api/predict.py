import json
import datetime
from fastapi import APIRouter, HTTPException
from backend.app.schemas.prediction import PredictionInput, PredictionResponse
from backend.app.services.ml_service import ml_service
from backend.app.services.recommendation_service import recommendation_service
from backend.app.database.db import get_db_connection

router = APIRouter()

@router.post("/predict", response_model=PredictionResponse)
def predict_student_performance(input_data: PredictionInput):
    """
    Execute real-time machine learning prediction using the fitted Random Forest and Gradient Boosting pipelines.
    Computes at-risk outcome, probability, continuous score, local SHAP explanations, and supportive recommendations.
    Saves record to SQLite prediction history.
    """
    try:
        # 1. Real ML Inference
        pred_result = ml_service.predict(input_data)
        
        # 2. Supportive Academic Recommendations
        recommendations = recommendation_service.generate_recommendations(input_data, pred_result)
        
        # 3. Persist to SQLite
        student_id = input_data.student_identifier or f"STU_PRED_{int(datetime.datetime.now().timestamp())}"
        now_iso = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO predictions (
                    student_identifier, course, input_features, predicted_at_risk,
                    risk_probability, predicted_grade, risk_tier, confidence_level,
                    explanation, recommendations, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                student_id,
                input_data.course,
                json.dumps(input_data.model_dump()),
                pred_result["predicted_at_risk"],
                pred_result["risk_probability"],
                pred_result["predicted_grade"],
                pred_result["risk_tier"],
                pred_result["confidence_level"],
                json.dumps([f.model_dump() for f in pred_result["contributing_factors"]]),
                json.dumps([r.model_dump() for r in recommendations]),
                now_iso
            ))
            prediction_id = cursor.lastrowid
            
        return PredictionResponse(
            prediction_id=prediction_id,
            student_identifier=student_id,
            course=input_data.course,
            predicted_at_risk=pred_result["predicted_at_risk"],
            predicted_outcome=pred_result["predicted_outcome"],
            risk_probability=pred_result["risk_probability"],
            confidence_percentage=pred_result["confidence_percentage"],
            confidence_level=pred_result["confidence_level"],
            predicted_grade=pred_result["predicted_grade"],
            risk_tier=pred_result["risk_tier"],
            contributing_factors=pred_result["contributing_factors"],
            supportive_recommendations=recommendations,
            created_at=now_iso,
            is_simulated=False
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference pipeline execution error: {str(e)}")
