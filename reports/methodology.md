# Machine Learning Methodology & Mathematical Formulation
**Project Title:** Smart Student Performance Prediction and Analytics System  

---

## 1. Mathematical Formulation of the Prediction Task

### 1.1 Objective and Target Definition
Let the input space be denoted by $\mathcal{X} \subset \mathbb{R}^d$, where $d = 32$ represents the candidate early-warning features observable at mid-term ($G1$).

Let $G_3 \in [0, 20]$ denote the official final course examination score. In accordance with Portuguese secondary education statutory evaluation standards (*Ensino Secundário*, Decreto-Lei n.º 139/2012):
$$\text{at\_risk} = y = \begin{cases} 1 & \text{if } G_3 < 10 \quad (\text{Academic Failure / Retenção}) \\ 0 & \text{if } G_3 \ge 10 \quad (\text{Satisfactory Progression / Pass}) \end{cases}$$

The learning objective is to estimate a probabilistic mapping:
$$f: \mathcal{X} \to [0, 1], \quad f(\mathbf{x}) = P(y = 1 \mid \mathbf{x})$$
minimizing the asymmetric cost function where False Negatives (missed failing students) incur a substantially higher penalty $C_{FN}$ than False Positives $C_{FP}$:
$$\mathcal{L}(y, \hat{y}) = C_{FN} \cdot \mathbb{I}(y=1, \hat{y}=0) + C_{FP} \cdot \mathbb{I}(y=0, \hat{y}=1)$$

---

## 2. Leakage-Safe Feature Representation

To eliminate data leakage, the feature vector $\mathbf{x}$ strictly excludes:
1. $G_3$ (the final outcome target).
2. $G_2$ (the second-period assessment grade recorded in Month 7, immediately before finals).

The candidate vector comprises:
- **Numerical Features ($p=14$):** Standardized using z-score normalization:
  $$z_j = \frac{x_j - \mu_j}{\sigma_j}$$
- **Categorical Features ($p=18$):** One-hot encoded with `handle_unknown='ignore'` to guarantee robustness against unexpected out-of-vocabulary levels during deployment.

All transformation parameters $(\mu_j, \sigma_j, \text{categories})$ are estimated exclusively from the training folds via Scikit-Learn `ColumnTransformer`.

---

## 3. Group-Stratified Cross-Validation Architecture

Because 382 students are enrolled in both Mathematics and Portuguese language courses, naive random splitting would place observations from the same individual in both training and test sets, causing demographic and lifestyle leakage.

To guarantee zero leakage, each student is assigned an invariant composite identifier:
$$\text{student\_id} = h(\text{school}, \text{sex}, \text{age}, \text{address}, \text{famsize}, \text{Pstatus}, \text{Medu}, \text{Fedu}, \text{Mjob}, \text{Fjob}, \text{reason}, \text{nursery}, \text{internet})$$
Partitioning is governed by `StratifiedGroupKFold` ($K=5$):
$$\mathcal{S}_{\text{train}} \cap \mathcal{S}_{\text{test}} = \emptyset, \quad \frac{|\{i \in \mathcal{S} : y_i = 1\}|}{|\mathcal{S}|} \approx 0.2203$$

---

## 4. Primary Algorithm Formulations

### 4.1 Random Forest Classifier (Selected Primary Model)
An ensemble of $B = 100$ decorrelated decision trees $\{T_b\}_{b=1}^B$:
$$\hat{f}_{\text{RF}}(\mathbf{x}) = \frac{1}{B} \sum_{b=1}^B T_b(\mathbf{x})$$
To counter class imbalance, tree bootstrap samples are drawn with balanced class weighting:
$$w_k = \frac{N}{2 \cdot N_k}$$

### 4.2 Local Interpretability via SHAP (SHapley Additive exPlanations)
For an individual student profile $\mathbf{x}^*$, the prediction output is decomposed additively into feature contributions $\phi_j$:
$$f(\mathbf{x}^*) = \phi_0 + \sum_{j=1}^M \phi_j(\mathbf{x}^*)$$
where $\phi_j$ is the unique Shapley value computed across all feature subsets $S \subseteq F \setminus \{j\}$:
$$\phi_j = \sum_{S \subseteq F \setminus \{j\}} \frac{|S|!(|F| - |S| - 1)!}{|F|!} \left[ f(S \cup \{j\}) - f(S) \right]$$
This guarantees local accuracy, missingness, and consistency for every prediction displayed in the dashboard.
