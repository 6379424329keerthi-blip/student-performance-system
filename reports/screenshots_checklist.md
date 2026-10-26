# Application Screenshots Checklist & Visual Guide
**Project Title:** Smart Student Performance Prediction and Analytics System  
**Application Dashboard:** [http://localhost:5173](http://localhost:5173)  
**API Swagger Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)  

Use this checklist to capture high-resolution figures for your final academic submission and project report.

---

## Screenshot Inspection Checklist

| Figure ID | Screen / View | Description of Captured Elements | Navigation Path in UI |
|---|---|---|---|
| **Fig 1.1** | **Overview KPI Dashboard** | Top 5 KPI cards (Total records: 1,044, Average score: 11.3/20, At-risk rate: 22.0%, Model recall: 93.5%, 5 Evaluated models) | Click `Overview` in sidebar |
| **Fig 1.2** | **Subject Benchmarks & Risk Tier** | Curriculum cards (Math vs Portuguese) and multi-tier donut chart | Scroll to middle of `Overview` |
| **Fig 1.3** | **Progression & SQLite Audit Table** | Formative G1-to-final G3 bar chart and recent predictions table | Scroll to bottom of `Overview` |
| **Fig 2.1** | **Student Cohort Directory** | Filterable cohort cards with search bar, subject filter, and risk badges | Click `Students` in sidebar |
| **Fig 2.2** | **Student Profile Inspection** | Detailed individual student card showing Mid-term G1, Actual G3, and "Predict & Intervene" action | In `Students` page |
| **Fig 3.1** | **Interactive Prediction Form** | 32-feature input form across tabs (Core Academic, Demographics, Lifestyle) with quick preset buttons | Click `Performance Prediction` in sidebar |
| **Fig 3.2** | **Live Prediction Output Badge** | Result card showing "At Risk" (Red) or "Pass" (Green) badge, Probability Gauge (e.g. 83.6%), and Expected Final Grade | In `Performance Prediction` after clicking "Predict" |
| **Fig 3.3** | **SHAP Local Explanation Waterfall** | Directional feature contribution list showing exact positive and negative SHAP impact values | In `Performance Prediction` results section |
| **Fig 3.4** | **Supportive Academic Interventions** | Categorized, prioritized ethical recommendations (High, Medium, Informational) | Below SHAP explanations in `Prediction` |
| **Fig 4.1** | **Analytics & Score Distributions** | Binned histogram comparison of Mid-term G1 vs Final G3 across 0-20 scale | Click `Analytics` in sidebar |
| **Fig 4.2** | **Study Time & Retention Hazards** | Bar charts showing failure rate vs. self-study hours and prior class failures | In `Analytics` page |
| **Fig 5.1** | **Dataset Explorer Table** | Paginated 1,044-row table with course filters, search bar, and CSV export button | Click `Dataset Explorer` in sidebar |
| **Fig 6.1** | **Model Comparison Benchmark** | Full comparison table (Dummy, Logistic Regression, Decision Tree, Random Forest, Gradient Boosting) | Click `Model Evaluation` in sidebar |
| **Fig 6.2** | **Interactive Confusion Matrix** | Detailed TN, FP, FN, TP diagnostic grid for selected model with sensitivity/specificity metrics | Middle of `Model Evaluation` |
| **Fig 6.3** | **Global Feature Importance Ranking** | Top 12 Gini MDI feature importance bar chart highlighting G1, failures, absences | Bottom of `Model Evaluation` |
| **Fig 7.1** | **Academic Reports & Downloads** | Project report summary and export buttons for CSV and JSON evaluation results | Click `Reports` in sidebar |
| **Fig 8.1** | **Settings & System Health** | FastAPI service health status, Uptime, SQLite connection, and model versioning | Click `Settings` in sidebar |
| **Fig 9.1** | **FastAPI Swagger Documentation** | Interactive OpenAPI documentation showing all 14 documented endpoints | Visit [http://localhost:8000/docs](http://localhost:8000/docs) |
| **Fig 10.1** | **Automated Pytest Execution** | Terminal screenshot showing all 26 tests passing in 3.88s | Run `python -m pytest tests/ -v` |
