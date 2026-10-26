import os
import json
import math
from typing import Optional
from fastapi import APIRouter, Query
from backend.app.core.config import settings
from backend.app.database.db import get_db_connection

router = APIRouter()

@router.get("/models")
def list_models(dataset_id: Optional[str] = Query(default=None)):
    """List all evaluated machine learning models and operational metadata for active dataset."""
    meta_path = os.path.join(settings.MODELS_DIR, "model_metadata.json")
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    if not dataset_id or dataset_id.lower() in ["uci", "0", "benchmark"]:
        return meta

    # College Dataset evaluation info
    try:
        ds_num = int(dataset_id)
    except ValueError:
        ds_num = 1

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM datasets WHERE id = ?", (ds_num,))
        ds_row = cursor.fetchone()
        ds_name = ds_row["name"] if ds_row else f"College Cohort #{ds_num}"

        # Check for predictions with ground truth
        cursor.execute("""
            SELECT s.observed_final_score, s.observed_at_risk,
                   p.predicted_grade, p.predicted_at_risk
            FROM institution_predictions p
            JOIN institution_students s ON p.student_pk = s.id
            WHERE p.dataset_id = ? AND s.observed_final_score IS NOT NULL
        """, (ds_num,))
        evaluated_pairs = cursor.fetchall()

    if evaluated_pairs:
        # Calculate real metrics on ground truth
        y_true_cls = [r["observed_at_risk"] for r in evaluated_pairs]
        y_pred_cls = [r["predicted_at_risk"] for r in evaluated_pairs]
        y_true_reg = [float(r["observed_final_score"]) for r in evaluated_pairs]
        y_pred_reg = [float(r["predicted_grade"]) for r in evaluated_pairs]

        n = len(y_true_cls)
        tp = sum(1 for yt, yp in zip(y_true_cls, y_pred_cls) if yt == 1 and yp == 1)
        fp = sum(1 for yt, yp in zip(y_true_cls, y_pred_cls) if yt == 0 and yp == 1)
        fn = sum(1 for yt, yp in zip(y_true_cls, y_pred_cls) if yt == 1 and yp == 0)
        tn = sum(1 for yt, yp in zip(y_true_cls, y_pred_cls) if yt == 0 and yp == 0)

        acc = round((tp + tn) / max(1, n), 4)
        rec = round(tp / max(1, (tp + fn)), 4)
        prec = round(tp / max(1, (tp + fp)), 4)
        f1 = round(2 * (prec * rec) / max(1e-6, (prec + rec)), 4)

        mae = round(sum(abs(yt - yp) for yt, yp in zip(y_true_reg, y_pred_reg)) / max(1, n), 2)
        rmse = round(math.sqrt(sum((yt - yp) ** 2 for yt, yp in zip(y_true_reg, y_pred_reg)) / max(1, n)), 2)

        meta["dataset_evaluation_context"] = {
            "dataset_id": str(ds_num),
            "dataset_name": ds_name,
            "evaluation_mode": "Empirical Ground-Truth Validation",
            "evaluated_students_count": n,
            "empirical_performance": {
                "accuracy": acc,
                "recall": rec,
                "precision": prec,
                "f1": f1,
                "mae": mae,
                "rmse": rmse,
                "confusion_matrix": {"tp": tp, "fp": fp, "fn": fn, "tn": tn}
            }
        }
    else:
        meta["dataset_evaluation_context"] = {
            "dataset_id": str(ds_num),
            "dataset_name": ds_name,
            "evaluation_mode": "Prospective Early-Warning Transfer Mode",
            "evaluated_students_count": 0,
            "note": "Final exam grades not yet recorded for this ongoing cohort. Using fitted benchmark knowledge base with zero-leakage continuous assessment mapping."
        }

    return meta

@router.get("/models/comparison")
def get_model_comparison(dataset_id: Optional[str] = Query(default=None)):
    """Retrieve experimental comparison table for classification and regression architectures."""
    clf_comp_path = os.path.join(settings.RESULTS_DIR, "classification_comparison.json")
    reg_comp_path = os.path.join(settings.RESULTS_DIR, "regression_comparison.json")
    
    with open(clf_comp_path, "r", encoding="utf-8") as f:
        clf_comp = json.load(f)
        
    with open(reg_comp_path, "r", encoding="utf-8") as f:
        reg_comp = json.load(f)
        
    training_source = "UCI Student Performance Benchmark (ID 320, Cortez & Silva 2008)"
    if dataset_id and dataset_id.lower() not in ["uci", "0", "benchmark"]:
        training_source = f"College Cohort #{dataset_id} (Transfer Learning from Benchmark Pipeline)"

    return {
        "dataset_id": dataset_id or "uci",
        "training_dataset_source": training_source,
        "classification_comparison": clf_comp,
        "regression_comparison": reg_comp,
        "primary_metric": "At-Risk Recall & Macro F1 (Prioritizing detection of failing students)",
        "test_cohort_size": 209,
        "cv_folds": 5,
        "split_methodology": "StratifiedGroupKFold on student_id (Zero Student Leakage)"
    }

@router.get("/models/feature-importance")
def get_feature_importance(dataset_id: Optional[str] = Query(default=None)):
    """Retrieve ranked global feature importance scores."""
    imp_path = os.path.join(settings.RESULTS_DIR, "feature_importance.json")
    with open(imp_path, "r", encoding="utf-8") as f:
        importance = json.load(f)
        
    cleaned = []
    for item in importance[:20]:
        feat = item["feature"]
        clean = feat.replace("num__", "").replace("cat__", "")
        cleaned.append({
            "feature": clean,
            "raw_feature": feat,
            "importance": round(item["importance"], 4)
        })
    return {
        "dataset_id": dataset_id or "uci",
        "top_features": cleaned
    }

@router.get("/models/metrics")
def get_best_model_metrics(dataset_id: Optional[str] = Query(default=None)):
    """Detailed performance metrics, confusion matrix, and per-class reports for the selected model."""
    meta_path = os.path.join(settings.MODELS_DIR, "model_metadata.json")
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    if not dataset_id or dataset_id.lower() in ["uci", "0", "benchmark"]:
        return {
            "dataset_id": "uci",
            "selected_classifier": meta["selected_classifier"],
            "selected_regressor": meta["selected_regressor"],
            "leakage_safeguards": meta["leakage_safeguards"]
        }

    # College Dataset metrics
    try:
        ds_num = int(dataset_id)
    except ValueError:
        ds_num = 1

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM datasets WHERE id = ?", (ds_num,))
        ds_row = cursor.fetchone()
        ds_name = ds_row["name"] if ds_row else f"College Cohort #{ds_num}"

        cursor.execute("""
            SELECT s.observed_final_score, s.observed_at_risk,
                   p.predicted_grade, p.predicted_at_risk
            FROM institution_predictions p
            JOIN institution_students s ON p.student_pk = s.id
            WHERE p.dataset_id = ? AND s.observed_final_score IS NOT NULL
        """, (ds_num,))
        evaluated = cursor.fetchall()

    clf_metrics = dict(meta["selected_classifier"])
    clf_metrics["dataset_scope"] = ds_name
    
    if evaluated:
        y_true_cls = [r["observed_at_risk"] for r in evaluated]
        y_pred_cls = [r["predicted_at_risk"] for r in evaluated]
        n = len(y_true_cls)
        tp = sum(1 for yt, yp in zip(y_true_cls, y_pred_cls) if yt == 1 and yp == 1)
        fp = sum(1 for yt, yp in zip(y_true_cls, y_pred_cls) if yt == 0 and yp == 1)
        fn = sum(1 for yt, yp in zip(y_true_cls, y_pred_cls) if yt == 1 and yp == 0)
        tn = sum(1 for yt, yp in zip(y_true_cls, y_pred_cls) if yt == 0 and yp == 0)

        acc = round((tp + tn) / max(1, n), 4)
        rec = round(tp / max(1, (tp + fn)), 4)
        prec = round(tp / max(1, (tp + fp)), 4)
        f1 = round(2 * (prec * rec) / max(1e-6, (prec + rec)), 4)

        clf_metrics["test_performance"] = {
            "accuracy": acc,
            "recall": rec,
            "precision": prec,
            "f1": f1,
            "confusion_matrix": {"tp": tp, "fp": fp, "fn": fn, "tn": tn},
            "evaluated_records": n
        }
    else:
        clf_metrics["evaluation_status"] = "Prospective Mode: Ground-truth final exams pending. Benchmark reference test metrics displayed."

    return {
        "dataset_id": str(ds_num),
        "dataset_name": ds_name,
        "selected_classifier": clf_metrics,
        "selected_regressor": meta["selected_regressor"],
        "leakage_safeguards": meta["leakage_safeguards"]
    }
