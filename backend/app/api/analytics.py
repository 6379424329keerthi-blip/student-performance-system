import os
import pandas as pd
import numpy as np
from typing import Optional
from fastapi import APIRouter, Query
from backend.app.core.config import settings
from backend.app.database.db import get_db_connection
from backend.app.services.college_feature_mapper import calculate_scaled_g1

router = APIRouter()

def load_uci_data():
    return pd.read_csv(os.path.join(settings.DATA_DIR, "student_performance_cleaned.csv"))

@router.get("/analytics/performance")
def get_performance_analytics(dataset_id: Optional[str] = Query(default=None)):
    """Academic grade distributions, formative vs summative progression, and course comparisons."""
    if not dataset_id or dataset_id.lower() in ["uci", "0", "benchmark"]:
        df = load_uci_data()
        
        # 1. Score Distribution Bins (0-20)
        bins = list(range(0, 22, 2))
        labels = [f"{b}-{b+1}" for b in range(0, 20, 2)]
        
        df["g1_bin"] = pd.cut(df["G1"], bins=bins, labels=labels, right=False)
        df["g3_bin"] = pd.cut(df["G3"], bins=bins, labels=labels, right=False)
        
        g1_counts = df["g1_bin"].value_counts().sort_index().to_dict()
        g3_counts = df["g3_bin"].value_counts().sort_index().to_dict()
        
        score_bins = []
        for label in labels:
            score_bins.append({
                "range": label,
                "midterm_g1_count": int(g1_counts.get(label, 0)),
                "final_g3_count": int(g3_counts.get(label, 0))
            })
            
        progression = df.groupby(pd.cut(df["G1"], bins=[0, 8, 10, 12, 14, 16, 21], right=False), observed=False)["G3"].mean().round(1).to_dict()
        progression_list = [
            {"midterm_range": str(k), "avg_final_grade": float(v)} for k, v in progression.items() if not pd.isna(v)
        ]
        
        subject_summary = []
        for course in ["Math", "Portuguese"]:
            sub = df[df["course"] == course]
            subject_summary.append({
                "course": course,
                "record_count": len(sub),
                "avg_midterm_g1": round(float(sub["G1"].mean()), 1),
                "avg_final_g3": round(float(sub["G3"].mean()), 1),
                "passing_rate": round(float((1 - sub["at_risk"]).mean()) * 100, 1),
                "at_risk_rate": round(float(sub["at_risk"].mean()) * 100, 1)
            })
            
        return {
            "score_distribution_bins": score_bins,
            "performance_progression": progression_list,
            "subject_summary": subject_summary
        }

    # College Dataset Performance Analytics
    try:
        ds_num = int(dataset_id)
    except ValueError:
        ds_num = 1

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM institution_students WHERE dataset_id = ?", (ds_num,))
        rows = cursor.fetchall()

    if not rows:
        return {
            "score_distribution_bins": [],
            "performance_progression": [],
            "subject_summary": []
        }

    df = pd.DataFrame([dict(r) for r in rows])
    df["scaled_g1"] = df.apply(
        lambda r: calculate_scaled_g1(
            float(r["internal_marks"]), float(r["max_internal_marks"]),
            float(r["previous_score"]), float(r["max_previous_score"]),
            float(r["assignment_marks"]), float(r["max_assignment_marks"])
        ),
        axis=1
    )
    df["effective_g3"] = df["observed_final_score"].fillna(df["scaled_g1"])
    df["at_risk"] = ((df["attendance_percentage"] < 75.0) | (df["scaled_g1"] < 10.0)).astype(int)

    bins = list(range(0, 22, 2))
    labels = [f"{b}-{b+1}" for b in range(0, 20, 2)]
    df["g1_bin"] = pd.cut(df["scaled_g1"], bins=bins, labels=labels, right=False)
    df["g3_bin"] = pd.cut(df["effective_g3"], bins=bins, labels=labels, right=False)
    
    g1_counts = df["g1_bin"].value_counts().sort_index().to_dict()
    g3_counts = df["g3_bin"].value_counts().sort_index().to_dict()
    
    score_bins = [
        {
            "range": label,
            "midterm_g1_count": int(g1_counts.get(label, 0)),
            "final_g3_count": int(g3_counts.get(label, 0))
        }
        for label in labels
    ]

    progression = df.groupby(pd.cut(df["scaled_g1"], bins=[0, 8, 10, 12, 14, 16, 21], right=False), observed=False)["effective_g3"].mean().round(1).to_dict()
    progression_list = [
        {"midterm_range": str(k), "avg_final_grade": float(v)} for k, v in progression.items() if not pd.isna(v)
    ]

    subject_summary = []
    for dept, grp in df.groupby("department"):
        subject_summary.append({
            "course": dept,
            "record_count": len(grp),
            "avg_midterm_g1": round(float(grp["scaled_g1"].mean()), 1),
            "avg_final_g3": round(float(grp["effective_g3"].mean()), 1),
            "passing_rate": round(float((1 - grp["at_risk"]).mean()) * 100, 1),
            "at_risk_rate": round(float(grp["at_risk"].mean()) * 100, 1)
        })

    return {
        "score_distribution_bins": score_bins,
        "performance_progression": progression_list,
        "subject_summary": subject_summary
    }

@router.get("/analytics/risk")
def get_risk_analytics(dataset_id: Optional[str] = Query(default=None)):
    """In-depth behavioral, lifestyle, and observed academic outcome breakdowns."""
    if not dataset_id or dataset_id.lower() in ["uci", "0", "benchmark"]:
        df = load_uci_data()
        
        tier_counts = df["risk_tier"].value_counts().to_dict()
        tier_dist = [
            {"tier": "High Risk", "count": int(tier_counts.get("High Risk", 0)), "percentage": round(tier_counts.get("High Risk", 0) / len(df) * 100, 1), "description": "Observed final G3 < 10 (Urgent intervention)"},
            {"tier": "Moderate Risk", "count": int(tier_counts.get("Moderate Risk", 0)), "percentage": round(tier_counts.get("Moderate Risk", 0) / len(df) * 100, 1), "description": "Observed borderline 10 <= G3 < 14"},
            {"tier": "Low Risk", "count": int(tier_counts.get("Low Risk", 0)), "percentage": round(tier_counts.get("Low Risk", 0) / len(df) * 100, 1), "description": "Observed mastery G3 >= 14"}
        ]
        
        study_map = {1: "< 2 hrs/wk", 2: "2 - 5 hrs/wk", 3: "5 - 10 hrs/wk", 4: "> 10 hrs/wk"}
        study_risk = df.groupby("studytime", observed=False)["at_risk"].agg(["mean", "count"]).round(3)
        study_breakdown = [
            {"hours_label": study_map.get(idx, str(idx)), "at_risk_rate": round(float(row["mean"]) * 100, 1), "student_count": int(row["count"])}
            for idx, row in study_risk.iterrows()
        ]
        
        fail_risk = df.groupby("failures", observed=False)["at_risk"].agg(["mean", "count"]).round(3)
        fail_breakdown = [
            {"failures": int(idx), "at_risk_rate": round(float(row["mean"]) * 100, 1), "student_count": int(row["count"])}
            for idx, row in fail_risk.iterrows()
        ]
        
        absence_bins = [0, 4, 8, 15, 100]
        absence_labels = ["0 - 3 days", "4 - 7 days", "8 - 14 days", "15+ days"]
        df["absence_bracket"] = pd.cut(df["absences"], bins=absence_bins, labels=absence_labels, right=False)
        abs_risk = df.groupby("absence_bracket", observed=False)["at_risk"].agg(["mean", "count"]).round(3)
        abs_breakdown = [
            {"bracket": str(idx), "at_risk_rate": round(float(row["mean"]) * 100, 1), "student_count": int(row["count"])}
            for idx, row in abs_risk.iterrows()
        ]
        
        return {
            "multi_tier_distribution": tier_dist,
            "study_time_vs_risk": study_breakdown,
            "prior_failures_vs_risk": fail_breakdown,
            "absences_vs_risk": abs_breakdown
        }

    # College Dataset Risk Analytics
    try:
        ds_num = int(dataset_id)
    except ValueError:
        ds_num = 1

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM institution_students WHERE dataset_id = ?", (ds_num,))
        rows = cursor.fetchall()

    if not rows:
        return {
            "multi_tier_distribution": [],
            "study_time_vs_risk": [],
            "prior_failures_vs_risk": [],
            "absences_vs_risk": []
        }

    df = pd.DataFrame([dict(r) for r in rows])
    df["scaled_g1"] = df.apply(
        lambda r: calculate_scaled_g1(
            float(r["internal_marks"]), float(r["max_internal_marks"]),
            float(r["previous_score"]), float(r["max_previous_score"]),
            float(r["assignment_marks"]), float(r["max_assignment_marks"])
        ),
        axis=1
    )
    df["at_risk"] = ((df["attendance_percentage"] < 75.0) | (df["scaled_g1"] < 10.0)).astype(int)
    
    # Assign risk tier
    def get_tier(row):
        if row["at_risk"] == 1 or row["scaled_g1"] < 10.0:
            return "High Risk"
        elif row["scaled_g1"] < 14.0 or row["attendance_percentage"] < 85.0:
            return "Moderate Risk"
        else:
            return "Low Risk"

    df["risk_tier"] = df.apply(get_tier, axis=1)
    
    tier_counts = df["risk_tier"].value_counts().to_dict()
    tier_dist = [
        {"tier": "High Risk", "count": int(tier_counts.get("High Risk", 0)), "percentage": round(tier_counts.get("High Risk", 0) / len(df) * 100, 1), "description": "Critical Risk: Attendance < 75% or Formative Grade < 10/20"},
        {"tier": "Moderate Risk", "count": int(tier_counts.get("Moderate Risk", 0)), "percentage": round(tier_counts.get("Moderate Risk", 0) / len(df) * 100, 1), "description": "Moderate Risk: Borderline performance (10-14/20)"},
        {"tier": "Low Risk", "count": int(tier_counts.get("Low Risk", 0)), "percentage": round(tier_counts.get("Low Risk", 0) / len(df) * 100, 1), "description": "Low Risk: Strong performance and regular attendance (>85%)"}
    ]

    # Study time breakdown
    def map_study_tier(hours):
        h = float(hours)
        if h < 2: return "< 2 hrs/wk"
        elif h < 5: return "2 - 5 hrs/wk"
        elif h < 10: return "5 - 10 hrs/wk"
        else: return "> 10 hrs/wk"

    df["study_label"] = df["study_hours_per_week"].apply(map_study_tier)
    study_order = ["< 2 hrs/wk", "2 - 5 hrs/wk", "5 - 10 hrs/wk", "> 10 hrs/wk"]
    study_risk = df.groupby("study_label", observed=False)["at_risk"].agg(["mean", "count"]).reindex(study_order).fillna(0).round(3)
    study_breakdown = [
        {"hours_label": idx, "at_risk_rate": round(float(row["mean"]) * 100, 1), "student_count": int(row["count"])}
        for idx, row in study_risk.iterrows()
    ]

    # Failures breakdown
    fail_risk = df.groupby("failures", observed=False)["at_risk"].agg(["mean", "count"]).round(3)
    fail_breakdown = [
        {"failures": int(idx), "at_risk_rate": round(float(row["mean"]) * 100, 1), "student_count": int(row["count"])}
        for idx, row in fail_risk.iterrows()
    ]

    # Attendance brackets
    att_bins = [0, 75, 85, 101]
    att_labels = ["Critical (<75%)", "Warning (75-85%)", "Good (>85%)"]
    df["att_bracket"] = pd.cut(df["attendance_percentage"], bins=att_bins, labels=att_labels, right=False)
    att_risk = df.groupby("att_bracket", observed=False)["at_risk"].agg(["mean", "count"]).round(3)
    abs_breakdown = [
        {"bracket": str(idx), "at_risk_rate": round(float(row["mean"]) * 100, 1), "student_count": int(row["count"])}
        for idx, row in att_risk.iterrows()
    ]

    return {
        "multi_tier_distribution": tier_dist,
        "study_time_vs_risk": study_breakdown,
        "prior_failures_vs_risk": fail_breakdown,
        "absences_vs_risk": abs_breakdown
    }
