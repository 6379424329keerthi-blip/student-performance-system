"""
Automated Model Pipeline and Serialization Test Suite
Smart Student Performance Prediction and Analytics System
"""

import os
import json
import joblib
import pytest
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
RESULTS_DIR = os.path.join(BASE_DIR, "reports", "results")

def test_model_artifacts_exist():
    """Verify serialization of all required pipelines and metadata."""
    assert os.path.exists(os.path.join(MODELS_DIR, "best_classifier_pipeline.joblib")), "Missing best classifier"
    assert os.path.exists(os.path.join(MODELS_DIR, "best_regressor_pipeline.joblib")), "Missing best regressor"
    assert os.path.exists(os.path.join(MODELS_DIR, "all_classifiers.joblib")), "Missing all classifiers bundle"
    assert os.path.exists(os.path.join(MODELS_DIR, "model_metadata.json")), "Missing model metadata"
    assert os.path.exists(os.path.join(MODELS_DIR, "feature_schema.json")), "Missing feature schema"
    assert os.path.exists(os.path.join(MODELS_DIR, "shap_background_sample.joblib")), "Missing SHAP background sample"

def test_best_classifier_inference_raw_inputs():
    """Verify best classifier accepts raw dictionary/DataFrame input with zero manual transformation."""
    model = joblib.load(os.path.join(MODELS_DIR, "best_classifier_pipeline.joblib"))
    with open(os.path.join(MODELS_DIR, "feature_schema.json"), "r") as f:
        schema = json.load(f)
        
    sample_input = pd.DataFrame([schema["defaults"]])
    pred = model.predict(sample_input)
    proba = model.predict_proba(sample_input)
    
    assert pred[0] in [0, 1], f"Invalid prediction: {pred[0]}"
    assert proba.shape == (1, 2), f"Invalid probability shape: {proba.shape}"
    assert np.isclose(proba.sum(), 1.0), "Probabilities do not sum to 1"

def test_best_regressor_inference():
    """Verify continuous grade predictor outputs valid scores."""
    reg = joblib.load(os.path.join(MODELS_DIR, "best_regressor_pipeline.joblib"))
    with open(os.path.join(MODELS_DIR, "feature_schema.json"), "r") as f:
        schema = json.load(f)
        
    sample_input = pd.DataFrame([schema["defaults"]])
    score = reg.predict(sample_input)[0]
    assert 0.0 <= score <= 20.0, f"Score out of range: {score}"

def test_preprocessor_handles_unknown_categories():
    """Verify that unseen categorical levels are safely ignored without crashing."""
    model = joblib.load(os.path.join(MODELS_DIR, "best_classifier_pipeline.joblib"))
    with open(os.path.join(MODELS_DIR, "feature_schema.json"), "r") as f:
        schema = json.load(f)
        
    corrupt_input = schema["defaults"].copy()
    corrupt_input["Mjob"] = "astronaut"
    corrupt_input["reason"] = "teleportation"
    corrupt_input["school"] = "UNKNOWN_SCHOOL"
    
    df_corrupt = pd.DataFrame([corrupt_input])
    pred = model.predict(df_corrupt)
    assert pred[0] in [0, 1], "Failed to handle unknown categorical level safely"

def test_test_set_performance_integrity():
    """Verify model performance on untouched test set matches registered metrics."""
    with open(os.path.join(RESULTS_DIR, "classification_comparison.json"), "r") as f:
        records = json.load(f)
        
    rf_record = next(r for r in records if "RandomForest" in r["model_name"])
    dummy_record = next(r for r in records if "Dummy" in r["model_name"])
    
    # Baseline dummy should have 0 recall for minority class
    assert dummy_record["test_recall"] == 0.0, "Dummy should have 0 recall"
    
    # Selected Random Forest must achieve superior at-risk detection
    assert rf_record["test_recall"] >= 0.90, f"Expected RF recall >= 0.90, got {rf_record['test_recall']}"
    assert rf_record["test_roc_auc"] >= 0.90, f"Expected RF ROC-AUC >= 0.90, got {rf_record['test_roc_auc']}"
    assert rf_record["test_accuracy"] >= 0.85, f"Expected RF accuracy >= 0.85, got {rf_record['test_accuracy']}"

def test_confusion_matrix_reconciliation():
    """Verify confusion matrix counts sum exactly to test set size (N=209)."""
    with open(os.path.join(RESULTS_DIR, "classification_comparison.json"), "r") as f:
        records = json.load(f)
        
    for r in records:
        cm = r["confusion_matrix"]
        total = cm["tn"] + cm["fp"] + cm["fn"] + cm["tp"]
        assert total == 209, f"Confusion matrix total {total} != 209 for {r['model_name']}"
        assert cm["tp"] + cm["fn"] == 46, f"Total actual at-risk students {cm['tp'] + cm['fn']} != 46"
        assert cm["tn"] + cm["fp"] == 163, f"Total actual pass students {cm['tn'] + cm['fp']} != 163"

def test_feature_compatibility_between_train_and_inference():
    """
    SECTION 16 CHECK: Compatibility between training and inference features.
    Verifies that the training feature set exactly matches the inference schema.
    """
    with open(os.path.join(MODELS_DIR, "model_metadata.json"), "r") as f:
        meta = json.load(f)
    with open(os.path.join(MODELS_DIR, "feature_schema.json"), "r") as f:
        schema = json.load(f)
        
    train_features = meta["features"]["all_predictors"]
    inference_features = schema["predictors"]
    
    assert train_features == inference_features, "Feature mismatch between training and inference!"
    assert len(train_features) == 32, f"Expected 32 features, got {len(train_features)}"
    assert "G2" not in train_features, "Data leakage! G2 found in predictors"
    assert "G3" not in train_features, "Data leakage! G3 found in predictors"
