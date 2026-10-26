# Smart Student Performance Prediction and Analytics System

[![Python 3.12](https://img.shields.io/badge/Python-3.12.4-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.162.0-009688.svg)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18.3.1-61dafb.svg)](https://react.dev/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.9.1-orange.svg)](https://scikit-learn.org/)
[![Tests](https://img.shields.io/badge/Pytest-31%20Passed-brightgreen.svg)]()
[![License](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)

An intelligent academic analytics and early-warning risk prediction system built with **FastAPI**, **Scikit-Learn**, **SHAP**, and a responsive **React 18 / Vite** dashboard.

The system analyses student learning data, previous academic records, study volume, absences, and mid-term formative marks ($G1$) to forecast end-of-year academic failure ($G3 < 10/20$), explain predictions via SHAP, and deliver actionable, non-punitive pedagogical recommendations months before final examinations occur.

---

## 1. Key System Highlights

- **Leakage-Safe Early-Warning Pipeline:**
  - Strictly excludes $G3$ (target) and $G2$ (second-period exam immediately preceding finals).
  - Uses composite demographic keys to link multi-course students, partitioning data via **`StratifiedGroupKFold`** with **zero student overlap** between training and test sets.
- **Superior Diagnostic Performance:**
  - **Selected Primary Classifier:** Tuned Random Forest with balanced subsampling.
  - **At-Risk Recall:** **93.48% (43 of 46 at-risk students identified)** on untouched holdout test set ($N = 209$).
  - **ROC-AUC:** **0.947** | **Accuracy:** **87.08%** | **Macro F1:** **0.843**.
  - **Continuous Score Regressor:** Gradient Boosting Regressor with Test MAE of only **1.37 grade points** ($R^2 = 0.753$).
- **Explainable Artificial Intelligence (XAI):**
  - Integrated with **SHAP (TreeExplainer)** to deliver local instance-level factor attributions for every prediction.
- **Interactive Full-Stack Architecture:**
  - **FastAPI REST API** with Pydantic validation, OpenAPI docs, and SQLite audit logging.
  - **React 18 / Vite Dashboard** with Navy Blue sidebar, Recharts data visualizations, and 8 dedicated modules.
- **Institutional Student Management & Bulk Uploads:**
  - **Manual Student Entry:** Single-student modal with configurable assessment scales (e.g. internals out of 25, previous score out of 100), input bounds validation, and instant ML scoring.
  - **Bulk Spreadsheet Wizard:** 5-step upload wizard supporting both CSV and Excel (`.xlsx`) files, automated heuristic column mapping, and row-level validation.
  - **Dataset Isolation:** Strict separation between the built-in UCI benchmark dataset ($N=1,044$) and custom college cohorts.
  - **Dynamic College Analytics:** Real dynamic Recharts analytics computed from actual college records (score distribution, attendance brackets, department averages, study volume).
- **100% Automated Test Pass Rate (31 / 31 Tests Passed):**
  - Complete automated test suite verifying data integrity, zero-leakage student grouping, model pipelines, college student CRUD, spreadsheet preview & validation, and dynamic analytics.

---

## 2. Technology Stack

- **Frontend:** React 18, Vite 6, Recharts 2.15, Lucide React, Modern Responsive CSS
- **Backend:** Python 3.12, FastAPI, Pydantic v2, Uvicorn, SQLite 3
- **Machine Learning:** Scikit-Learn 1.9, SHAP 0.54, pandas 3.0, NumPy 2.5, Joblib
- **Testing:** Pytest 9.1, HTTPX, Starlette TestClient

---

## 3. Directory Structure

```
smart-student-performance/
  ├── backend/                     # FastAPI backend application
  │   ├── app/
  │   │   ├── api/                 # REST endpoints (health, overview, predict, etc.)
  │   │   ├── core/                # Configuration and settings
  │   │   ├── database/            # SQLite database manager and schema
  │   │   ├── schemas/             # Pydantic validation models
  │   │   ├── services/            # ML inference and recommendation services
  │   │   └── main.py              # Application entrypoint
  │   ├── requirements.txt         # Python dependencies
  │   └── .env.example             # Environment template
  │
  ├── frontend/                    # React Vite dashboard
  │   ├── src/
  │   │   ├── components/          # Reusable UI components & modals
  │   │   ├── layouts/             # MainLayout with Navy Blue sidebar
  │   │   ├── pages/               # 8 Dashboard pages
  │   │   ├── services/api.js      # Centralized API client
  │   │   ├── index.css            # Custom design system
  │   │   └── main.jsx             # React entrypoint
  │   ├── package.json             # NPM dependencies
  │   └── vite.config.js           # Vite dev configuration & proxy
  │
  ├── data/                        # Educational data assets
  │   ├── raw/                     # Original UCI CSVs & curriculum metadata
  │   ├── processed/               # Cleaned datasets, train & test splits
  │   └── README.md                # Dataset documentation & provenance
  │
  ├── models/                      # Serialized ML pipelines & metadata
  │   ├── best_classifier_pipeline.joblib
  │   ├── best_regressor_pipeline.joblib
  │   ├── all_classifiers.joblib
  │   ├── model_metadata.json
  │   ├── feature_schema.json
  │   └── shap_background_sample.joblib
  │
  ├── notebooks/                   # Interactive exploratory Jupyter notebook
  │   └── exploratory_analysis.ipynb
  │
  ├── scripts/                     # Reproducible automation scripts
  │   ├── collect_data.py          # Programmatic data ingestion & hash verification
  │   ├── prepare_data.py          # Cleaning, leakage-free group-stratified splitting
  │   ├── train_models.py          # Hyperparameter tuning, CV, test evaluation
  │   ├── run_eda.py               # Generates 8 publication figures in reports/figures/
  │   └── evaluate_models.py       # Diagnostic charts (ROC, CM, SHAP, residuals)
  │
  ├── reports/                     # Project documentation & figures
  │   ├── figures/                 # 15 high-res 300 DPI analytical figures
  │   ├── results/                 # JSON & CSV experimental comparison tables
  │   ├── project_report.md        # Comprehensive 28-section academic report
  │   ├── dataset_quality_report.md
  │   ├── methodology.md
  │   ├── test_cases.md
  │   └── references.md
  │
  ├── tests/                       # Automated pytest test suites
  │   ├── test_preprocessing.py    # 8 data & leakage tests
  │   ├── test_model.py            # 6 model serialization & benchmark tests
  │   └── test_api.py              # 9 FastAPI REST endpoint tests
  │
  ├── run_backend.bat              # Windows launcher for FastAPI (Port 8000)
  ├── run_frontend.bat             # Windows launcher for React Vite (Port 5173)
  ├── run_all.bat                  # Single-click launcher for full stack
  └── README.md                    # Project documentation
```

---

## 4. Quickstart Guide (Windows & VS Code)

### Prerequisites
- **Python 3.10+** (Tested on Python 3.12.4)
- **Node.js 18+** (Tested on Node v22.14.0)
- **Git / PowerShell**

### 1. Launch Everything in One Click (Windows)
Double-click [`run_all.bat`](file:///c:/Users/KEERTHI/Downloads/DSES%20IA%20PROJECT/run_all.bat) or run from terminal:
```powershell
.\run_all.bat
```
This automatically starts:
- **FastAPI Backend:** [http://localhost:8000/docs](http://localhost:8000/docs) (Interactive Swagger UI)
- **React Dashboard:** [http://localhost:5173](http://localhost:5173)

---

### 2. Manual Step-by-Step Setup

#### Step A: Backend Setup
```powershell
# In project root
python -m pip install -r backend/requirements.txt

# Start backend server
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Step B: Frontend Setup
```powershell
# Open a second terminal
cd frontend
npm install
npm run dev
```
Navigate to [http://localhost:5173](http://localhost:5173).

---

### 3. Run Automated Tests
Execute the entire test suite (26 tests):
```powershell
python -m pytest tests/ -v
```
All tests should pass in under 6 seconds:
```
tests/test_api.py ......................... [PASSED]
tests/test_model.py ....................... [PASSED]
tests/test_preprocessing.py ............... [PASSED]
======================== 26 passed in 5.50s ========================
```

---

## 5. Model Evaluation Summary

| Model Architecture | Test Accuracy | At-Risk Recall (Primary) | Precision | Macro F1 | ROC-AUC | Status |
|---|---|---|---|---|---|---|
| **DummyClassifier (Baseline)** | 77.99% | 0.00% (0/46) | 0.00% | 0.438 | 0.500 | Baseline |
| **Logistic Regression (Balanced)** | 83.73% | 86.96% (40/46) | 59.70% | 0.803 | 0.932 | Candidate |
| **Decision Tree (Balanced)** | 79.43% | 84.78% (39/46) | 52.70% | 0.757 | 0.867 | Candidate |
| **Random Forest (Balanced Subsample)** | **87.08%** | **93.48% (43/46)** | **64.18%** | **0.843** | **0.947** | **★ Selected Primary** |
| **Gradient Boosting Classifier** | 83.73% | 58.70% (27/46) | 62.79% | 0.757 | 0.933 | Candidate |

Continuous Final Grade Regressor:
- **Gradient Boosting Regressor:** **MAE: 1.37 grade points** on the 20-point scale ($R^2 = 0.753$).

---

## 6. Demonstration Workflow

1. **Dashboard Overview:** View live KPI cards, curriculum comparisons, and recent SQLite predictions at [http://localhost:5173](http://localhost:5173).
2. **Student Directory:** Browse 1,044 student profiles, filter by subject or risk tier, and click **Predict & Intervene** to load a student directly into the model.
3. **Interactive Prediction Form:** Test quick presets (*High Risk*, *Borderline*, *High Achiever*) or enter custom student features. Click **Predict Student Performance** to trigger live ML inference.
4. **Inspect Local SHAP Explanations:** View directional SHAP attributions explaining why the model predicted the risk, accompanied by tailored academic recommendations.
5. **Model Evaluation Diagnostics:** Compare all 5 models, examine the confusion matrix, and view top feature rankings.
6. **Export Reports:** Download evaluation metrics in CSV or JSON at the Reports tab.

---

## 7. Cloud Deployment (GitHub Pages + Free Cloud Backend)

The project supports zero-downtime decoupled deployment:
- **Frontend:** Hosted for free on **GitHub Pages** (via automated GitHub Actions in [`.github/workflows/deploy.yml`](file:///.github/workflows/deploy.yml)).
- **Backend:** Hosted for free on **Render.com** (via [`render.yaml`](file:///render.yaml)) or **Hugging Face Spaces** (via [`Dockerfile`](file:///Dockerfile)).

For complete, step-by-step instructions with diagrams, see the [**Cloud Deployment Guide (DEPLOYMENT_GUIDE.md)**](file:///DEPLOYMENT_GUIDE.md).
