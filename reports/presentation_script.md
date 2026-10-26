# Academic Project Presentation Script & Viva Voce Defense Guide
## Smart Student Performance Prediction and Analytics System Using Machine Learning

**Target Audience:** Academic Project Evaluation Committee, External Examiners, College Faculty  
**Presentation Duration:** 12 to 15 Minutes + 5 Minutes Q&A  
**Author Role:** Senior Machine Learning Engineer & Full-Stack Developer  

---

## 1. Slide-by-Slide Speaking Script

### Slide 1: Title & Project Scope (Minute 0:00 - 1:00)
> *"Respected panel members and examiners, good morning. Today, I am presenting my final individual project: **Smart Student Performance Prediction and Analytics System Using Machine Learning**.*
>
> *In contemporary education, institutions collect vast amounts of learning and assessment records. However, underperformance is typically diagnosed only at the conclusion of the academic year during final examinations, when remedial action is either impossible or too late. The objective of this project is to develop an end-to-end, leakage-free machine learning platform that forecasts student academic risk early in the school year, explains the underlying factors using game-theoretic SHAP values, and delivers actionable pedagogical interventions through a production-grade full-stack dashboard."*

---

### Slide 2: Real-World Problem Statement & Statutory Grading (Minute 1:00 - 2:30)
> *"To formulate our problem realistically, we adopted the statutory secondary education evaluation framework of Portugal (*Direção-Geral da Educação*). Secondary school grades operate on a continuous integer scale from **$0$ to $20$ points**.*
>
> *Under national educational statutes, the passing cutoff is **$10$ points**. Any score below $10$ ($G3 < 10$) represents statutory course failure (*retenção*), mandating grade retention. Therefore, our primary prediction task is defined as: **predicting whether a student is at risk ($G3 < 10$) using only data available at the mid-term formative assessment stage ($G1$)**.*
>
> *In addition, our system performs multi-tier diagnostic triaging: High Risk ($G3 < 10$), Moderate Risk ($10 \le G3 < 14$), and Low Risk ($G3 \ge 14$), and continuous final grade forecasting ($0-20$ scale) using regression."*

---

### Slide 3: Dataset Ingestion, Ethics & Web Metadata (Minute 2:30 - 3:45)
> *"We utilized the authentic **UCI Machine Learning Repository Student Performance Dataset** (Cortez & Silva, 2008), licensed under **Creative Commons Attribution 4.0 International (CC BY 4.0)**.*
>
> *Our programmatic ingestion script verifies cryptographic SHA-256 hashes for all raw files: $395$ Mathematics records and $649$ Portuguese language records, totaling **$1,044$ enrollment records**.*
>
> *Regarding the rubric requirement for web-collected data: In accordance with GDPR and FERPA statutes, student personal microdata cannot ethically or legally be web-scraped. Therefore, we programmatically scraped and compiled public secondary curriculum standards from the Portuguese Ministry of Education to enrich course benchmarks, while keeping student records completely anonymized."*

---

### Slide 4: Leakage Prevention & Group Splitting (Minute 3:45 - 5:15)
> *"A critical contribution of this project is our **strict methodology for preventing data leakage**:*
>
> *First, we strictly exclude the second-period grade ($G2$) from our predictors. In many published papers, researchers carelessly include $G2$, which is recorded only weeks before the final exam. This causes severe near-target leakage and renders early intervention useless. We exclusively use mid-term grade $G1$ (recorded in Month 3), leaving 6 full months of intervention runway.*
>
> *Second, Cortez & Silva noted that $382$ students appear in both Mathematics and Portuguese datasets. A naive random split would place the same student's demographic profile in both training and testing sets. We constructed composite demographic keys to assign unique `student_id` tags and executed **`StratifiedGroupKFold`** ($K=5$, `random_state=42`). This mathematically guarantees **zero student overlap** across training and holdout test splits."*

---

### Slide 5: Exploratory Data Analysis Highlights (Minute 5:15 - 6:45)
> *"Our pipeline generated 15 publication-grade figures in `reports/figures/`. Key statistical insights include:*
> 1. *Target Imbalance: The cohort exhibits an overall failure rate of $22.03\%$. Mathematics failure rate ($32.9\%$) is more than double that of Portuguese ($15.4\%$).*
> 2. *Study Time: Students studying $<2$ hours/week have a $28.2\%$ at-risk rate, whereas studying $5-10$ hours/week drops risk to $11.8\%$.*
> 3. *Past Failures: Having 2 or more prior retentions elevates failure risk to over $80\%$.*
> 4. *Mid-term Correlation: Mid-term formative grade $G1$ correlates strongly with final grade $G3$ ($r = 0.80$), confirming its reliability as an early warning signal."*

---

### Slide 6: Machine Learning Methodology & Comparison (Minute 6:45 - 8:30)
> *"We benchmarked five classification models and five regression models against uninformed baselines on our untouched $209$-record holdout test set:*
>
> - *The **DummyClassifier Baseline** achieved $78.0\%$ accuracy by always guessing 'Pass', but had **$0.0\%$ Recall** on at-risk students, missing every single failing student. This demonstrates why accuracy alone is an invalid metric in educational analytics.*
> - *Our **Selected Model — Random Forest Classifier with balanced subsampling** — achieved an outstanding **At-Risk Recall of 93.48% (43 of 46 at-risk students successfully caught)**, an **ROC-AUC of 0.947**, and an **Accuracy of 87.08%**.*
> - *Our continuous grade predictor — **Gradient Boosting Regressor** — predicted final grades with a Mean Absolute Error of only **$1.37$ grade points** ($R^2 = 0.753$)."*

---

### Slide 7: Explainability & Pedagogical Interventions (Minute 8:30 - 10:00)
> *"Predictive accuracy alone is insufficient for educators. We integrated **SHAP TreeExplainer** into our inference service.*
>
> *For every prediction, the system computes exact Shapley values, showing educators the directional impact of each feature. For example, if a student has low $G1$ and high absences, SHAP quantifies how much each factor pushed the probability toward risk.*
>
> *Most importantly, our recommendation engine maps these SHAP factors into non-punitive, supportive academic interventions: scheduling tutoring, time-management mentoring, or welfare check-ins, while cautioning educators when confidence is borderline."*

---

### Slide 8: Full-Stack Architecture & Verification (Minute 10:00 - 12:00)
> *"To demonstrate practical deployment, we developed a complete full-stack web application:*
> - *A **FastAPI REST backend** with Pydantic validation, OpenAPI documentation, and an SQLite database for prediction history.*
> - *A modern **React 18 / Vite dashboard** styled with a Navy Blue sidebar, Recharts visual analytics, and 8 dedicated modules (Overview, Students, Prediction Form, Analytics, Dataset Explorer, Model Evaluation, Reports, Settings).*
> - *Zero Hardcoded Data: Every chart, metric card, and prediction result is fetched dynamically from the live API.*
> - *Quality Assurance: **26 automated pytest unit tests** pass with 100% success in under 4 seconds.*
>
> *Thank you. I welcome your questions."*

---

## 2. Viva Voce Defense: Top 10 Questions and Model Answers

### Q1: Why did you choose Random Forest instead of Gradient Boosting or Deep Learning?
**Answer:**
> *"In our hyperparameter cross-validation and test set evaluation, Random Forest with balanced subsampling achieved the highest Recall on the at-risk class ($93.48\%$) with an ROC-AUC of $0.947$, whereas Gradient Boosting tended to prioritize precision ($62.8\%$) at the expense of recall ($58.7\%$). In early warning, catching $43$ out of $46$ failing students is far more valuable than minimizing minor precautionary alerts. Furthermore, with $1,044$ tabular records, tree-based ensembles are less prone to overfitting than deep neural networks and natively integrate with TreeExplainer for fast, exact SHAP computation."*

### Q2: Why is accuracy a misleading metric here?
**Answer:**
> *"Because of class imbalance: $78.0\%$ of students pass, and only $22.0\%$ are at risk. A naive baseline that predicts 'Pass' for all students achieves an apparently impressive $78.0\%$ accuracy, but its recall for failing students is exactly $0\%$. In our rubric, we explicitly prioritized At-Risk Recall, Macro F1, and ROC-AUC over raw accuracy."*

### Q3: How did you ensure there was zero data leakage?
**Answer:**
> *"We implemented three layers of leakage defense: First, we strictly excluded $G2$ and $G3$ from the feature set. Second, we linked multi-course students using $13$ invariant demographic attributes and performed `StratifiedGroupKFold` on `student_id`, mathematically ensuring that no individual student appears in both training and test sets. Third, all preprocessing transformations were fitted inside `ColumnTransformer` pipelines strictly within cross-validation folds, never touching the test set."*

### Q4: What happens if a student enters an unknown categorical value in the API?
**Answer:**
> *"Our pipeline uses `OneHotEncoder(handle_unknown='ignore')`. If an out-of-vocabulary level is provided, it encodes that feature as all zeros without throwing an unhandled exception. Automated unit test `test_preprocessor_handles_unknown_categories` explicitly verifies this behavior."*

### Q5: How do you handle ethical considerations in student performance prediction?
**Answer:**
> *"We explicitly enforce that predictions are probabilistic indicators, not deterministic labels. Our system does not display punitive advice. Instead, it generates supportive recommendations such as offering additional practice, setting up tutoring, or scheduling advisory check-ins. When the model probability is borderline ($40-60\%$), the system advises educators to wait for second-term continuous evaluation before finalizing interventions."*
