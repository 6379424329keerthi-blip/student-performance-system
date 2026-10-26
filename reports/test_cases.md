# Automated Test Cases and Verification Matrix
**Project Title:** Smart Student Performance Prediction and Analytics System  
**Execution Environment:** Windows 11, Python 3.12.4, pytest 9.1.1  
**Overall Test Result:** **26 Passed / 0 Failed (100.0% Success Rate in 3.88s)**  

---

## 1. Data Ingestion & Preprocessing Test Cases (`tests/test_preprocessing.py`)

| Test ID | Test Function | Purpose / Verification Objective | Input / Fixture | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| TC-PRE-01 | `test_data_files_exist` | Verify presence of all raw and processed dataset files | File system paths | All 6 data files exist on disk | Files confirmed present | **PASSED** |
| TC-PRE-02 | `test_total_records_and_subjects` | Verify cohort size matches official benchmarks | Cleaned dataset CSV | Total rows = 1,044 (Math: 395, Por: 649) | Exact row count: 1,044 | **PASSED** |
| TC-PRE-03 | `test_zero_missing_values` | Audit for null or missing values across all features | Full dataset | `isnull().sum().sum() == 0` | Exactly 0 missing values | **PASSED** |
| TC-PRE-04 | `test_value_bounds` | Verify statutory and biological range constraints | Age, G1, G2, G3, Absences | Age $\in [15, 22]$, Grades $\in [0, 20]$, Absences $\ge 0$ | All values within bounds | **PASSED** |
| TC-PRE-05 | `test_target_formulation_logic` | Verify `at_risk` target strictly equals $G3 < 10$ | Target column vs G3 | Total at-risk = 230, binary match | 230 at-risk records matched | **PASSED** |
| TC-PRE-06 | `test_train_test_split_sizes` | Verify 80/20 partitioning integrity | Train and test CSVs | Train = 835, Test = 209 (Sum = 1,044) | Exact split: 835 / 209 | **PASSED** |
| TC-PRE-07 | `test_zero_student_leakage_across_splits` | **CRITICAL:** Ensure 0 overlapping students between train & test | `student_id` sets | Intersection count == 0 | **0 overlapping students** | **PASSED** |
| TC-PRE-08 | `test_stratification_preservation` | Verify class balance is preserved in both splits | Train & test at-risk mean | Both splits within 1% of 22.03% | Train: 22.0%, Test: 22.0% | **PASSED** |

---

## 2. Machine Learning Model Pipeline Test Cases (`tests/test_model.py`)

| Test ID | Test Function | Purpose / Verification Objective | Input / Fixture | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| TC-MOD-01 | `test_model_artifacts_exist` | Verify serialization of all required pipelines and metadata | `models/` directory | All `.joblib` & `.json` artifacts exist | 6 model artifacts confirmed | **PASSED** |
| TC-MOD-02 | `test_best_classifier_inference_raw_inputs` | Verify pipeline accepts raw DataFrame without manual encoding | Raw dictionary input | Predicts 0 or 1, valid probabilities sum to 1.0 | Prediction and proba valid | **PASSED** |
| TC-MOD-03 | `test_best_regressor_inference` | Verify continuous score prediction output bounds | Raw dictionary input | Score $\in [0.0, 20.0]$ | Valid score: 11.8 / 20 | **PASSED** |
| TC-MOD-04 | `test_preprocessor_handles_unknown_categories` | Verify pipeline ignores unseen categorical levels | Corrupted input (`Mjob="astronaut"`) | Graceful handling via `handle_unknown='ignore'` | No crash; valid prediction | **PASSED** |
| TC-MOD-05 | `test_test_set_performance_integrity` | Verify measured metrics meet project thresholds | Classification comparison JSON | RF Recall $\ge 90\%$, ROC-AUC $\ge 90\%$, Dummy = 0% | RF Rec: 93.5%, AUC: 0.947 | **PASSED** |
| TC-MOD-06 | `test_confusion_matrix_reconciliation` | Verify confusion matrix counts sum to test size ($N=209$) | Confusion matrix dict | $TN + FP + FN + TP == 209$ | Reconciled: $139+24+3+43=209$ | **PASSED** |
| TC-MOD-07 | `test_feature_compatibility_between_train_and_inference` | Verify training feature schema matches inference schema exactly | Schema vs Metadata | 32 predictors match exactly; G2/G3 excluded | 100% Schema Compatibility | **PASSED** |

---

## 3. FastAPI Backend REST Endpoint Test Cases (`tests/test_api.py`)

| Test ID | Test Function | Purpose / Verification Objective | Request Endpoint | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| TC-API-01 | `test_api_health` | Verify service health status | `GET /api/health` | Status 200, models loaded, DB connected | Healthy, uptime verified | **PASSED** |
| TC-API-02 | `test_api_overview` | Verify dashboard KPI cards payload | `GET /api/overview` | Records = 1,044, Recall $\ge 90\%$ | Correct KPIs returned | **PASSED** |
| TC-API-03 | `test_api_dataset_summary` | Verify dataset summary statistics | `GET /api/dataset/summary` | Records = 1,044, Missing = 0 | 100% complete audit | **PASSED** |
| TC-API-04 | `test_api_dataset_records_pagination` | Verify filterable student records | `GET /api/dataset/records?limit=15` | Page 1, 15 records, filtered by course | Correct slice returned | **PASSED** |
| TC-API-05 | `test_api_models_comparison` | Verify model comparison table | `GET /api/models/comparison` | 5 classification models returned | All 5 models listed | **PASSED** |
| TC-API-06 | `test_api_models_feature_importance` | Verify global feature rankings | `GET /api/models/feature-importance` | Non-empty feature rankings | Top features ranked | **PASSED** |
| TC-API-07 | `test_api_predict_valid_student` | Verify end-to-end inference & SHAP | `POST /api/predict` with student JSON | Returns prediction, prob, SHAP factors, recommendations | Full schema returned (200) | **PASSED** |
| TC-API-08 | `test_api_predict_invalid_inputs_validation` | Verify Pydantic validation rejects bad inputs | `POST /api/predict` with $G1=99$ | HTTP 422 Unprocessable Entity | HTTP 422 returned | **PASSED** |
| TC-API-09 | `test_api_predictions_history` | Verify SQLite audit persistence | `GET /api/predictions` | Stored record retrieved with detail | Verified persistence | **PASSED** |
| TC-API-10 | `test_api_error_states_and_handling` | Verify 404 handling on missing resources | `GET /api/predictions/9999999` | HTTP 404 with error detail | HTTP 404 returned | **PASSED** |
| TC-API-11 | `test_api_reports_summary_and_export` | Verify reports metadata and CSV export | `GET /api/reports/export?format=csv` | Status 200, valid CSV payload | CSV exported | **PASSED** |
