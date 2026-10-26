"""
Test Suite: Data Ingestion, Preprocessing, and Split Leakage Integrity
Smart Student Performance Prediction and Analytics System
"""

import os
import pytest
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")

def test_data_files_exist():
    """Verify that all raw and processed dataset artifacts exist."""
    assert os.path.exists(os.path.join(RAW_DIR, "student-mat.csv")), "Missing student-mat.csv"
    assert os.path.exists(os.path.join(RAW_DIR, "student-por.csv")), "Missing student-por.csv"
    assert os.path.exists(os.path.join(RAW_DIR, "curriculum_metadata.json")), "Missing curriculum_metadata.json"
    assert os.path.exists(os.path.join(PROCESSED_DIR, "student_performance_cleaned.csv")), "Missing cleaned CSV"
    assert os.path.exists(os.path.join(PROCESSED_DIR, "train_set.csv")), "Missing train_set.csv"
    assert os.path.exists(os.path.join(PROCESSED_DIR, "test_set.csv")), "Missing test_set.csv"

def test_total_records_and_subjects():
    """Verify combined cohort dimensions match official Cortez & Silva benchmarks."""
    df = pd.read_csv(os.path.join(PROCESSED_DIR, "student_performance_cleaned.csv"))
    assert len(df) == 1044, f"Expected 1044 records, got {len(df)}"
    assert (df["course"] == "Math").sum() == 395, "Expected 395 Math records"
    assert (df["course"] == "Portuguese").sum() == 649, "Expected 649 Portuguese records"

def test_zero_missing_values():
    """Verify data completeness with zero missing values."""
    df = pd.read_csv(os.path.join(PROCESSED_DIR, "student_performance_cleaned.csv"))
    assert df.isnull().sum().sum() == 0, f"Found {df.isnull().sum().sum()} unexpected missing values"

def test_value_bounds():
    """Verify domain-specific value constraints."""
    df = pd.read_csv(os.path.join(PROCESSED_DIR, "student_performance_cleaned.csv"))
    assert df["age"].between(15, 22).all(), "Age out of bounds (15-22)"
    assert df["G1"].between(0, 20).all(), "G1 score out of bounds (0-20)"
    assert df["G2"].between(0, 20).all(), "G2 score out of bounds (0-20)"
    assert df["G3"].between(0, 20).all(), "G3 score out of bounds (0-20)"
    assert (df["absences"] >= 0).all(), "Negative absences detected"
    assert df["studytime"].between(1, 4).all(), "Study time not in scale 1-4"
    assert df["failures"].between(0, 4).all(), "Failures not in scale 0-4"

def test_target_formulation_logic():
    """Verify at_risk target is strictly G3 < 10."""
    df = pd.read_csv(os.path.join(PROCESSED_DIR, "student_performance_cleaned.csv"))
    expected_at_risk = (df["G3"] < 10).astype(int)
    assert (df["at_risk"] == expected_at_risk).all(), "at_risk target mismatch"
    assert df["at_risk"].sum() == 230, f"Expected 230 at-risk records, got {df['at_risk'].sum()}"

def test_train_test_split_sizes():
    """Verify train/test split size satisfies 80/20 partitioning."""
    train_df = pd.read_csv(os.path.join(PROCESSED_DIR, "train_set.csv"))
    test_df = pd.read_csv(os.path.join(PROCESSED_DIR, "test_set.csv"))
    assert len(train_df) + len(test_df) == 1044, "Total records in splits != 1044"
    assert len(train_df) == 835, f"Expected 835 training records, got {len(train_df)}"
    assert len(test_df) == 209, f"Expected 209 test records, got {len(test_df)}"

def test_zero_student_leakage_across_splits():
    """
    CRITICAL CHECK: Guarantee that no individual student appears in both
    training and test sets.
    """
    train_df = pd.read_csv(os.path.join(PROCESSED_DIR, "train_set.csv"))
    test_df = pd.read_csv(os.path.join(PROCESSED_DIR, "test_set.csv"))
    
    train_students = set(train_df["student_id"])
    test_students = set(test_df["student_id"])
    overlap = train_students.intersection(test_students)
    assert len(overlap) == 0, f"DATA LEAKAGE DETECTED! Overlapping students: {overlap}"

def test_stratification_preservation():
    """Verify class balance is preserved in both train and test splits."""
    train_df = pd.read_csv(os.path.join(PROCESSED_DIR, "train_set.csv"))
    test_df = pd.read_csv(os.path.join(PROCESSED_DIR, "test_set.csv"))
    
    train_risk = train_df["at_risk"].mean()
    test_risk = test_df["at_risk"].mean()
    
    # Both should be ~22.0%
    assert abs(train_risk - 0.2203) < 0.02, f"Train class balance shifted: {train_risk:.3f}"
    assert abs(test_risk - 0.2203) < 0.02, f"Test class balance shifted: {test_risk:.3f}"
