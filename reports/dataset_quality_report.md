# Dataset Quality and Preprocessing Report
**Project Title:** Smart Student Performance Prediction and Analytics System  
**Report Generated:** 2026-10-24 21:12:37  
**Target Variable:** `at_risk` (Binary Classification: $1$ if $G3 < 10$, $0$ otherwise)  

---

## 1. Executive Summary
The data preparation pipeline successfully integrated and sanitized the raw UCI Student Performance datasets across both secondary school subjects (Mathematics and Portuguese Language). All records underwent rigorous validation for missing values, out-of-bound anomalies, duplicate profiles, and potential cross-split data leakage.

Key pipeline highlights:
- **Zero Missing Values:** The dataset is 100% complete across all 1,044 enrollment records.
- **Leakage Prevention:** Composite student identities were established across courses; train/test partitioning employed strict **Stratified Group Splitting** ensuring **zero student overlap**.
- **Early-Warning Integrity:** $G2$ (second period exam) and $G3$ (final outcome) are excluded from the candidate feature set to ensure authentic early prediction using only mid-term formative markers ($G1$) and behavioral attributes.

---

## 2. Dataset Dimensions and Partitioning

| Metric | Full Dataset | Training Set (80%) | Holdout Test Set (20%) |
|---|---|---|---|
| **Total Enrollment Records** | 1044 | 835 | 209 |
| **Unique Individual Students** | 662 | 530 | 132 |
| **Students in Both Courses** | 360 | 289 | 71 |
| **At-Risk Count ($G3 < 10$)** | 230 | 184 | 46 |
| **Not At-Risk Count ($G3 \ge 10$)** | 814 | 651 | 163 |
| **At-Risk Class Proportion** | 22.03% | 22.04% | 22.01% |
| **Student Overlap between Splits** | — | — | **0 (Zero Leakage)** |

---

## 3. Data Integrity and Bound Validations

| Validation Check | Expected Rule | Actual Result | Status |
|---|---|---|---|
| **Missing Values Audit** | Exactly 0 missing values across all columns | 0 missing values | **PASSED** |
| **Duplicate Records Check** | 0 duplicate student-course rows | 0 duplicate rows | **PASSED** |
| **Age Range Bounds** | $15 \le \text{age} \le 22$ | Min: 15, Max: 22 | **PASSED** |
| **Mid-term Score Range ($G1$)** | $0 \le G1 \le 20$ | Min: 0, Max: 19 | **PASSED** |
| **Final Score Range ($G3$)** | $0 \le G3 \le 20$ | Min: 0, Max: 20 | **PASSED** |
| **Absences Range** | $\text{absences} \ge 0$ | Min: 0, Max: 75 | **PASSED** |
| **Study Time Scale** | Integer scale $1$ to $4$ | Min: 1, Max: 4 | **PASSED** |
| **Past Failures Scale** | Integer scale $0$ to $4$ | Min: 0, Max: 3 | **PASSED** |

---

## 4. Target Variable Breakdown

### 4.1 Course-Specific At-Risk Ratios
- **Mathematics (`course = 'Math'`):** 130 at risk out of 395 records (32.91%). Mathematics exhibits a substantially higher failure rate, highlighting course difficulty differences.
- **Portuguese Language (`course = 'Portuguese'`):** 100 at risk out of 649 records (15.41%). Portuguese language has lower failure rates with more normal distribution.
- **Combined Cohort:** 230 at risk out of 1,044 records (22.03%).

### 4.2 Multi-Tier Diagnostic Distribution
- **High Risk ($G3 < 10$):** 230 students (22.03%)
- **Moderate Risk ($10 \le G3 < 14$):** 520 students (49.81%)
- **Low Risk ($G3 \ge 14$):** 294 students (28.16%)

---

## 5. Candidate Feature Specification for Model Training

### 5.1 Early-Warning Features (Included in Model Pipelines)
- **Mid-term Academic Indicator:** `G1` (Period 1 mid-term examination score).
- **Academic Background & History:** `course`, `school`, `failures` (past course failures), `schoolsup` (school extra support), `paid` (subject-specific extra classes).
- **Study Habits & Engagement:** `studytime`, `absences`, `freetime`, `activities`.
- **Family & Demographics:** `sex`, `age`, `address`, `famsize`, `Pstatus`, `Medu`, `Fedu`, `Mjob`, `Fjob`, `guardian`, `famsup`, `famrel`.
- **Social & Lifestyle:** `goout`, `Dalc` (workday alcohol), `Walc` (weekend alcohol), `health`, `internet`, `higher`, `romantic`.

### 5.2 Excluded Features (Data Leakage Prevention)
- `G3`: Prediction target (both binary `at_risk` and multi-tier `risk_tier` are derived from this).
- `G2`: Second period grade. Excluded because it occurs immediately before the final exam $G3$, violating early-warning utility and creating near-tautological leakage.
- `student_id`: Used exclusively as a grouping key for cross-validation and split isolation; excluded from model training features.
