# Dataset Documentation: Student Performance and Academic Risk Analytics

## 1. Dataset Overview and Provenance
- **Dataset Name:** Student Performance Data Set
- **Primary Source:** UCI Machine Learning Repository (Dataset ID: 320)
- **Direct Source URL:** [UCI Student Performance](https://archive.ics.uci.edu/dataset/320/student+performance)
- **Associated Citation:**
  > Cortez, P., & Silva, A. (2008). *Using data mining to predict secondary school student performance*. In Proceedings of 5th Annual Future Business Technology Conference (FUBUTEC 2008), pp. 5–12, Porto, Portugal. EUROSIS, ISBN 978-9077381-39-7.
- **Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0). Open for academic, commercial, and research use with appropriate attribution.
- **Collection Method:** 
  1. *Primary Dataset:* Direct automated archive ingestion of the official UCI Student Performance dataset files (`student-mat.csv`, `student-por.csv`) via `scripts/collect_data.py`.
  2. *Web-Scraped Public Documentation:* Genuinely scraped public repository characteristics, headings, and terms of use from the public UCI dataset documentation web page (`https://archive.ics.uci.edu/dataset/320/student+performance`) via `requests` and `BeautifulSoup`, stored in `data/raw/scraped_public_metadata.json`.
  3. *Statutory Curriculum Standards:* Documented official Portuguese secondary curriculum evaluation benchmarks from *Decreto-Lei n.º 139/2012* (Direção-Geral da Educação, DGE) as codified domain contextual knowledge, stored in `data/raw/curriculum_metadata.json`.
- **Date of Acquisition:** October 2026.
- **Privacy and Ethics Confirmation:** The dataset contains completely anonymized student records from two Portuguese public secondary schools (Gabriel Pereira and Mousinho da Silveira in the Alentejo region of Portugal). No direct personal identifiers (PII), such as names, social security numbers, or addresses, were collected or scraped. Student privacy is strictly maintained in accordance with GDPR principles.

---

## 2. Real-World Problem Statement and Domain Context
Secondary education attrition and academic failure carry profound long-term social, economic, and developmental costs. Traditional institutional evaluations typically discover underperformance only after high-stakes end-of-year examinations (Summative Assessment $G3$), when remedial opportunities are either too late or costly.

By identifying early academic fragility at the conclusion of the first grading period (Formative Evaluation $G1$), secondary schools can deploy timely, targeted academic support—such as peer mentoring, supplementary tutoring, study-skills coaching, and counseling—before the student fails or drops out.

### Prediction Target Definition & Justification
- **Statutory Standard:** In the Portuguese secondary educational system, academic evaluation operates on a continuous integer scale from $0$ to $20$.
  - The statutory cutoff for passing is **$10$ points**.
  - Any score $G3 < 10$ represents academic failure (*retenção/reprovado*), requiring course repetition or summer remediation under *Decreto-Lei n.º 139/2012*.
- **Primary Prediction Task (Classification):**
  - **Class 1 — At-Risk (`at_risk = 1`):** Final grade $G3 < 10$. Indicates high likelihood of failing the academic year without structured intervention.
  - **Class 0 — Satisfactory / Not At-Risk (`at_risk = 0`):** Final grade $G3 \ge 10$. Student meets standard academic competencies.
- **Multi-Class Tier (Diagnostic Triaging):**
  - **High Risk:** $G3 < 10$ (Immediate remedial intervention required).
  - **Moderate / Borderline Risk:** $10 \le G3 < 14$ (Vulnerable passing grade; advisory check-in recommended).
  - **Low Risk / Good:** $G3 \ge 14$ (Solid mastery; eligible for advanced enrichment).
- **Secondary Target (Regression):** Continuous final grade prediction ($G3 \in [0, 20]$), evaluated via MAE, RMSE, and $R^2$.

### Data Leakage Prevention, Grouping Key Nature & Temporal Assumptions
To ensure true predictive validity and avoid data leakage:
1. **$G3$ (Final Grade)** is strictly the prediction target and is **never** used as an input feature or claimed as an actual future prediction when already observed.
2. **$G2$ (Second Period Grade)** is deliberately **excluded** from the early-warning model. In the Portuguese school calendar, $G2$ is evaluated in March/April, only weeks before the final exam $G3$. Using $G2$ causes severe near-target leakage and renders early intervention useless because it occurs too late in the academic year.
3. **$G1$ (First Period Grade)** is retained as a valid predictor. Formative mid-term assessments occur in December (Month 3 of the 10-month academic year), leaving 6 months of actionable pedagogical intervention time. This calendar timing is a domain modeling assumption supported by standard Portuguese secondary academic schedules (Cortez & Silva, 2008).
4. **Nature of `student_id` Grouping Key:** The dataset does not contain official student roll numbers or real-world identities. In accordance with the matching logic specified by Cortez & Silva (2008), 382 records across Mathematics and Portuguese language courses share identical demographic profiles across 13 invariant attributes (`school`, `sex`, `age`, `address`, `famsize`, `Pstatus`, `Medu`, `Fedu`, `Mjob`, `Fjob`, `reason`, `nursery`, `internet`). Our pipeline synthesizes an invariant composite grouping key `student_id` (`STU_0001` to `STU_0662`) to enforce **Stratified Group Splitting** (`StratifiedGroupKFold`). This represents an explicit heuristic safeguard ensuring that multi-course enrollment records from the same individual student profile do not leak across training and test splits.

---

## 3. Data Dictionary and Feature Schema

| Column Name | Type | Allowed Values / Range | Description | Availability at Early Warning |
|---|---|---|---|---|
| `student_id` | String | `STU_0001` - `STU_0662` | Anonymized composite identifier for grouping across courses | Metadata (Grouping) |
| `course` | Categorical | `Math`, `Portuguese` | Course subject | Input Feature |
| `school` | Categorical | `GP` (Gabriel Pereira), `MS` (Mousinho da Silveira) | School attended | Input Feature |
| `sex` | Categorical | `F` (Female), `M` (Male) | Student's biological sex | Input Feature |
| `age` | Numeric | 15 – 22 | Student's age in years | Input Feature |
| `address` | Categorical | `U` (Urban), `R` (Rural) | Home location type | Input Feature |
| `famsize` | Categorical | `LE3` ($\le 3$), `GT3` ($> 3$) | Family size | Input Feature |
| `Pstatus` | Categorical | `T` (Living together), `A` (Apart) | Parent cohabitation status | Input Feature |
| `Medu` | Numeric | 0 (None), 1 (4th grade), 2 (5th-9th), 3 (Secondary), 4 (Higher) | Mother's education level | Input Feature |
| `Fedu` | Numeric | 0 (None), 1 (4th grade), 2 (5th-9th), 3 (Secondary), 4 (Higher) | Father's education level | Input Feature |
| `Mjob` | Categorical | `teacher`, `health`, `services`, `at_home`, `other` | Mother's employment sector | Input Feature |
| `Fjob` | Categorical | `teacher`, `health`, `services`, `at_home`, `other` | Father's employment sector | Input Feature |
| `reason` | Categorical | `home` (Close to home), `reputation`, `course`, `other` | Reason for school selection | Input Feature |
| `guardian` | Categorical | `mother`, `father`, `other` | Legal guardian | Input Feature |
| `traveltime` | Numeric | 1 (<15 min), 2 (15-30 min), 3 (30-60 min), 4 (>60 min) | Travel time from home to school | Input Feature |
| `studytime` | Numeric | 1 (<2 hrs/wk), 2 (2-5 hrs/wk), 3 (5-10 hrs/wk), 4 (>10 hrs/wk) | Weekly dedicated self-study time | Input Feature |
| `failures` | Numeric | 0, 1, 2, 3, 4 | Number of previous class failures | Input Feature |
| `schoolsup` | Categorical | `yes`, `no` | Extra institutional educational support | Input Feature |
| `famsup` | Categorical | `yes`, `no` | Family educational support | Input Feature |
| `paid` | Categorical | `yes`, `no` | Extra paid tutoring in course subject | Input Feature |
| `activities` | Categorical | `yes`, `no` | Extra-curricular activity participation | Input Feature |
| `nursery` | Categorical | `yes`, `no` | Attended nursery school | Input Feature |
| `higher` | Categorical | `yes`, `no` | Aspirations to pursue higher education | Input Feature |
| `internet` | Categorical | `yes`, `no` | Internet access at home | Input Feature |
| `romantic` | Categorical | `yes`, `no` | Involved in a romantic relationship | Input Feature |
| `famrel` | Numeric | 1 (Very bad) to 5 (Excellent) | Quality of family relationships | Input Feature |
| `freetime` | Numeric | 1 (Very low) to 5 (Very high) | Leisure time after school | Input Feature |
| `goout` | Numeric | 1 (Very low) to 5 (Very high) | Frequency of socializing with peers | Input Feature |
| `Dalc` | Numeric | 1 (Very low) to 5 (Very high) | Workday alcohol consumption | Input Feature |
| `Walc` | Numeric | 1 (Very low) to 5 (Very high) | Weekend alcohol consumption | Input Feature |
| `health` | Numeric | 1 (Very bad) to 5 (Very good) | Current health status | Input Feature |
| `absences` | Numeric | 0 – 93 | Number of school absences recorded | Input Feature |
| `G1` | Numeric | 0 – 20 | First period grade (midterm benchmark) | Input Feature |
| `G2` | Numeric | 0 – 20 | Second period grade | **Excluded (Leakage Prevention)** |
| `G3` | Numeric | 0 – 20 | Final period grade (Official Course Outcome) | **Target Outcome Variable** |
| `at_risk` | Binary | 0 (Pass / Not at Risk), 1 (At Risk, $G3 < 10$) | **Primary Classification Target** |
| `risk_tier` | Categorical | `High Risk`, `Moderate Risk`, `Low Risk` | Multi-tier Diagnostic Target |

---

## 4. Directory Structure
```
data/
  raw/
    student-mat.csv             # Raw secondary school Math course records (N = 395)
    student-por.csv             # Raw secondary school Portuguese language records (N = 649)
    student.txt                 # Original UCI dataset documentation and attributes
    student-merge.R             # Cortez & Silva R merging script identifying multi-course students
    curriculum_metadata.json    # Statutory secondary curriculum benchmarks
    collection_manifest.json    # Cryptographic hashes, dates, source URLs, and provenance
  processed/
    student_performance_cleaned.csv      # Unified, validated, cleaned dataset (N = 1044)
    student_performance_cleaned.parquet  # High-performance Parquet format with preserved types
    train_set.csv                        # Group-stratified train set (80%)
    test_set.csv                         # Group-stratified holdout test set (20%)
  README.md                     # Comprehensive dataset documentation (this file)
```

---

## 5. Dataset Limitations and Ethical Constraints
1. **Ethical Non-Determinism:** Machine learning predictions represent probabilistic statistical patterns and risk likelihoods. They must **never** be used as punitive measures, deterministic labels, or tracking mechanisms to deny educational opportunities.
2. **Contextual Specificity:** The records reflect Portuguese secondary schools during the late 2000s. While demographic, behavioral, and formative evaluation relationships remain broadly applicable, direct generalization to different international school environments should involve local recalibration.
3. **No PII Web Scraping:** Scraping personal records or identifiable student information from web sources is prohibited under privacy statutes (GDPR, FERPA). Public web scraping was restricted strictly to permitted open institutional curriculum standards and course guidelines.
