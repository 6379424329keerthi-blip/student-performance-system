"""
Model Evaluation and Diagnostic Visualization Pipeline
Smart Student Performance Prediction and Analytics System

Generates high-resolution academic diagnostic charts in reports/figures/:
1. model_comparison_chart.png
2. confusion_matrices.png
3. roc_curves.png
4. feature_importance.png
5. shap_summary_plot.png
6. regression_actual_vs_predicted.png
7. error_analysis.png
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import roc_curve, auc, confusion_matrix, accuracy_score, recall_score, precision_score, f1_score
import shap

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
RESULTS_DIR = os.path.join(BASE_DIR, "reports", "results")
FIGURES_DIR = os.path.join(BASE_DIR, "reports", "figures")

sns.set_theme(style="whitegrid")
plt.rcParams.update({
    "font.family": "sans-serif",
    "font.size": 11,
    "axes.titlesize": 13,
    "axes.titleweight": "bold",
    "axes.labelsize": 11,
    "axes.labelweight": "semibold",
    "figure.dpi": 300
})

NAVY = "#1e3a8a"
TEAL = "#0d9488"
AMBER = "#d97706"
CRIMSON = "#dc2626"
EMERALD = "#059669"
PURPLE = "#7c3aed"
SLATE = "#475569"

def load_evaluation_data():
    comp_json = os.path.join(RESULTS_DIR, "classification_comparison.json")
    with open(comp_json, "r", encoding="utf-8") as f:
        comp_data = json.load(f)
        
    df_test = pd.read_csv(os.path.join(PROCESSED_DIR, "test_set.csv"))
    df_train = pd.read_csv(os.path.join(PROCESSED_DIR, "train_set.csv"))
    
    with open(os.path.join(MODELS_DIR, "feature_schema.json"), "r", encoding="utf-8") as f:
        schema = json.load(f)
        
    predictors = schema["predictors"]
    X_test = df_test[predictors]
    y_test = df_test["at_risk"]
    y_test_reg = df_test["G3"]
    
    all_models = joblib.load(os.path.join(MODELS_DIR, "all_classifiers.joblib"))
    best_clf = joblib.load(os.path.join(MODELS_DIR, "best_classifier_pipeline.joblib"))
    best_reg = joblib.load(os.path.join(MODELS_DIR, "best_regressor_pipeline.joblib"))
    
    importance_df = pd.read_json(os.path.join(RESULTS_DIR, "feature_importance.json"))
    
    return comp_data, df_test, X_test, y_test, y_test_reg, all_models, best_clf, best_reg, importance_df

def plot_model_comparison_chart(comp_data):
    """Plot 1: Grouped bar chart comparing all 5 models."""
    df_plot = pd.DataFrame(comp_data)
    
    # Simplify model labels
    label_map = {
        "DummyClassifier (Baseline)": "Dummy (Base)",
        "LogisticRegression": "Logistic Reg",
        "DecisionTreeClassifier": "Decision Tree",
        "RandomForestClassifier": "Random Forest",
        "GradientBoostingClassifier": "Grad Boosting"
    }
    df_plot["short_name"] = df_plot["model_name"].map(label_map)
    
    metrics = ["test_accuracy", "test_recall", "test_precision", "test_f1", "test_roc_auc"]
    metric_labels = ["Accuracy", "At-Risk Recall (Primary)", "Precision", "F1-Score", "ROC-AUC"]
    colors = [SLATE, CRIMSON, TEAL, AMBER, NAVY]
    
    fig, ax = plt.subplots(figsize=(14, 6))
    x = np.arange(len(df_plot))
    width = 0.16
    
    for i, (m, label, col) in enumerate(zip(metrics, metric_labels, colors)):
        vals = df_plot[m].values
        offset = (i - 2) * width
        bars = ax.bar(x + offset, vals, width, label=label, color=col, edgecolor="black", linewidth=0.7)
        for b in bars:
            h = b.get_height()
            if h > 0.05:
                ax.annotate(f"{h:.2f}", xy=(b.get_x() + b.get_width()/2, h),
                            xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=7.5, rotation=45)
                
    ax.set_title("Experimental Evaluation: Baseline vs. Candidate Machine Learning Models (Test Set N=209)", pad=14)
    ax.set_xticks(x)
    ax.set_xticklabels(df_plot["short_name"], fontsize=11, fontweight="bold")
    ax.set_ylabel("Score (0.0 to 1.0)")
    ax.set_ylim(0, 1.15)
    ax.axhline(1.0, color="gray", linestyle=":", alpha=0.5)
    ax.legend(loc="upper left", frameon=True, ncol=3)
    
    plt.tight_layout()
    out = os.path.join(FIGURES_DIR, "model_comparison_chart.png")
    plt.savefig(out, dpi=300)
    plt.close()
    print(f"[+] Saved {out}")

def plot_confusion_matrices(comp_data, all_models, X_test, y_test):
    """Plot 2: Grid of confusion matrices."""
    fig, axes = plt.subplots(1, 5, figsize=(20, 4.2))
    
    model_names = [
        "DummyClassifier (Baseline)",
        "LogisticRegression",
        "DecisionTreeClassifier",
        "RandomForestClassifier",
        "GradientBoostingClassifier"
    ]
    short_titles = ["Dummy (Base)", "Logistic Reg", "Decision Tree", "Random Forest (Selected)", "Grad Boosting"]
    
    for i, (name, title) in enumerate(zip(model_names, short_titles)):
        pipe = all_models[name]
        y_pred = pipe.predict(X_test)
        cm = confusion_matrix(y_test, y_pred)
        
        # Color map: highlight best model with Blues, baseline with Greys
        cmap = "Blues" if "RandomForest" in name else "YlGnBu"
        if "Dummy" in name:
            cmap = "Greys"
            
        sns.heatmap(cm, annot=True, fmt="d", cmap=cmap, ax=axes[i], cbar=False,
                    xticklabels=["Pred Pass", "Pred Risk"],
                    yticklabels=["Act Pass", "Act Risk"],
                    annot_kws={"size": 13, "weight": "bold"})
        axes[i].set_title(title, pad=10, fontsize=12, fontweight="bold")
        
        # Add Recall / F1 annotation under each matrix
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        acc = accuracy_score(y_test, y_pred)
        axes[i].set_xlabel(f"Acc: {acc:.1%} | Rec: {rec:.1%}\nF1: {f1:.3f}", labelpad=8, fontsize=9.5)
        
    plt.suptitle("Test Set Confusion Matrices: Early-Warning Performance Comparison (N = 209)", fontsize=14, fontweight="bold", y=1.05)
    plt.tight_layout()
    out = os.path.join(FIGURES_DIR, "confusion_matrices.png")
    plt.savefig(out, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"[+] Saved {out}")

def plot_roc_curves(all_models, X_test, y_test):
    """Plot 3: ROC Curves for all probabilistic models."""
    plt.figure(figsize=(9, 7))
    
    palette = {
        "DummyClassifier (Baseline)": (SLATE, "--"),
        "LogisticRegression": (NAVY, "-"),
        "DecisionTreeClassifier": (AMBER, "-."),
        "RandomForestClassifier": (EMERALD, "-"),
        "GradientBoostingClassifier": (PURPLE, "-")
    }
    
    for name, pipe in all_models.items():
        if hasattr(pipe, "predict_proba"):
            y_prob = pipe.predict_proba(X_test)[:, 1]
            fpr, tpr, _ = roc_curve(y_test, y_prob)
            roc_auc = auc(fpr, tpr)
            color, style = palette.get(name, ("black", "-"))
            lw = 2.5 if "RandomForest" in name else 1.8
            label = f"{name.split(' (')[0]} (AUC = {roc_auc:.3f})"
            plt.plot(fpr, tpr, color=color, linestyle=style, lw=lw, label=label)
            
    plt.plot([0, 1], [0, 1], "k--", lw=1.2, alpha=0.6, label="Chance Level (AUC = 0.500)")
    plt.xlim([-0.02, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel("False Positive Rate (1 - Specificity)")
    plt.ylabel("True Positive Rate (Sensitivity / At-Risk Recall)")
    plt.title("Receiver Operating Characteristic (ROC) Curve Comparison", pad=14, fontsize=13, fontweight="bold")
    plt.legend(loc="lower right", frameon=True, fontsize=10)
    plt.tight_layout()
    out = os.path.join(FIGURES_DIR, "roc_curves.png")
    plt.savefig(out, dpi=300)
    plt.close()
    print(f"[+] Saved {out}")

def plot_feature_importance(importance_df):
    """Plot 4: Top 15 Feature Importances."""
    plt.figure(figsize=(10, 7))
    
    top_df = importance_df.head(15).copy()
    # Clean feature names for publication presentation
    clean_names = top_df["feature"].str.replace("num__", "").str.replace("cat__", "")
    top_df["clean_name"] = clean_names
    
    # Color bar by type
    colors = [NAVY if "G1" in f else (CRIMSON if "fail" in f else TEAL) for f in top_df["clean_name"]]
    
    bars = plt.barh(top_df["clean_name"][::-1], top_df["importance"][::-1], color=colors[::-1], edgecolor="black", linewidth=0.7)
    plt.xlabel("Relative Importance Score (Gini / MDI)")
    plt.title("Top 15 Most Influential Features for Early At-Risk Identification (Random Forest)", pad=14, fontsize=13, fontweight="bold")
    
    for b in bars:
        w = b.get_width()
        plt.annotate(f"{w:.3f}", xy=(w, b.get_y() + b.get_height()/2),
                     xytext=(5, 0), textcoords="offset points", ha="left", va="center", fontsize=8.5, fontweight="bold")
        
    plt.xlim(0, max(top_df["importance"]) * 1.15)
    plt.tight_layout()
    out = os.path.join(FIGURES_DIR, "feature_importance.png")
    plt.savefig(out, dpi=300)
    plt.close()
    print(f"[+] Saved {out}")

def plot_shap_summary(best_clf, X_test):
    """Plot 5: SHAP Beeswarm summary visualization."""
    clf = best_clf.named_steps["classifier"]
    preprocessor = best_clf.named_steps["preprocessor"]
    
    X_test_trans = preprocessor.transform(X_test)
    feature_names = [f.replace("num__", "").replace("cat__", "") for f in preprocessor.get_feature_names_out()]
    
    explainer = shap.TreeExplainer(clf)
    shap_vals = explainer.shap_values(X_test_trans)
    
    if isinstance(shap_vals, list):
        shap_vals_class1 = shap_vals[1]
    elif len(shap_vals.shape) == 3:
        shap_vals_class1 = shap_vals[:, :, 1]
    else:
        shap_vals_class1 = shap_vals
        
    plt.figure(figsize=(11, 7))
    shap.summary_plot(shap_vals_class1, X_test_trans, feature_names=feature_names, max_display=12, show=False)
    plt.title("SHAP Feature Impact Summary on At-Risk Probability", fontsize=13, fontweight="bold", pad=14)
    plt.tight_layout()
    out = os.path.join(FIGURES_DIR, "shap_summary_plot.png")
    plt.savefig(out, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"[+] Saved {out}")

def plot_regression_actual_vs_predicted(best_reg, X_test, y_test_reg):
    """Plot 6: Actual vs Predicted Final Grade (G3) & Residual Analysis."""
    y_pred = best_reg.predict(X_test)
    residuals = y_test_reg - y_pred
    
    fig, axes = plt.subplots(1, 2, figsize=(14, 5.5))
    
    # 1. Actual vs Predicted
    axes[0].scatter(y_test_reg, y_pred, alpha=0.6, color=NAVY, edgecolor="black", s=45)
    axes[0].plot([0, 20], [0, 20], "r--", lw=2, label="Perfect Agreement (y = x)")
    axes[0].axvline(10, color=CRIMSON, linestyle=":", alpha=0.7, label="Statutory Passing Cutoff (10)")
    axes[0].axhline(10, color=CRIMSON, linestyle=":", alpha=0.7)
    axes[0].set_title(f"Actual vs. Predicted Final Score G3 ({type(best_reg.named_steps['regressor']).__name__})", pad=12)
    axes[0].set_xlabel("Actual Final Grade G3 (0 - 20 Scale)")
    axes[0].set_ylabel("Predicted Final Grade G3 (0 - 20 Scale)")
    axes[0].set_xlim(-0.5, 20.5)
    axes[0].set_ylim(-0.5, 20.5)
    axes[0].legend(loc="upper left")
    
    # 2. Residual Distribution
    sns.histplot(residuals, bins=25, kde=True, ax=axes[1], color=TEAL, edgecolor="black")
    axes[1].axvline(0, color="red", linestyle="--", lw=1.5, label=f"Mean Residual ({residuals.mean():.2f})")
    axes[1].set_title(f"Residual Distribution (e = G3_actual - G3_pred)", pad=12)
    axes[1].set_xlabel("Prediction Error (Grade Points)")
    axes[1].set_ylabel("Student Frequency")
    axes[1].legend()
    
    plt.tight_layout()
    out = os.path.join(FIGURES_DIR, "regression_actual_vs_predicted.png")
    plt.savefig(out, dpi=300)
    plt.close()
    print(f"[+] Saved {out}")

def plot_error_analysis(best_clf, df_test, X_test, y_test):
    """Plot 7: Diagnostic Error Analysis (False Positives vs False Negatives)."""
    y_pred = best_clf.predict(X_test)
    y_prob = best_clf.predict_proba(X_test)[:, 1]
    
    df_diag = df_test.copy()
    df_diag["y_pred"] = y_pred
    df_diag["y_prob"] = y_prob
    
    # Error classification
    def categorize_result(row):
        act, pred = row["at_risk"], row["y_pred"]
        if act == 1 and pred == 1:
            return "True Positive (Caught Risk)"
        elif act == 0 and pred == 0:
            return "True Negative (Correct Pass)"
        elif act == 0 and pred == 1:
            return "False Positive (Unnecessary Alert)"
        else:
            return "False Negative (Missed Risk)"
            
    df_diag["prediction_category"] = df_diag.apply(categorize_result, axis=1)
    
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    
    # Category counts
    cat_order = ["True Negative (Correct Pass)", "True Positive (Caught Risk)", "False Positive (Unnecessary Alert)", "False Negative (Missed Risk)"]
    cat_colors = [EMERALD, NAVY, AMBER, CRIMSON]
    counts = df_diag["prediction_category"].value_counts().reindex(cat_order)
    
    bars = axes[0].barh(cat_order[::-1], counts.values[::-1], color=cat_colors[::-1], edgecolor="black", height=0.55)
    axes[0].set_title("Test Set Prediction Diagnostic Breakdown (N = 209)", pad=12)
    axes[0].set_xlabel("Number of Students")
    for b in bars:
        w = b.get_width()
        pct = (w / len(df_diag)) * 100
        axes[0].annotate(f"{w} ({pct:.1f}%)", xy=(w, b.get_y() + b.get_height()/2),
                         xytext=(5, 0), textcoords="offset points", ha="left", va="center", fontsize=9, fontweight="bold")
    axes[0].set_xlim(0, max(counts.values) * 1.2)
    
    # G1 distribution across categories
    sns.boxplot(x="prediction_category", y="G1", data=df_diag, order=cat_order, palette=cat_colors, ax=axes[1], hue="prediction_category", legend=False)
    axes[1].axhline(10, color=CRIMSON, linestyle="--", label="Passing Cutoff (10)")
    axes[1].set_title("Mid-term Score (G1) Distribution by Prediction Category", pad=12)
    axes[1].set_xlabel("Prediction Outcome Category")
    axes[1].set_ylabel("G1 Mid-term Score (0 - 20)")
    axes[1].set_xticks(range(len(cat_order)))
    axes[1].set_xticklabels(["True Neg", "True Pos", "False Pos", "False Neg"], rotation=20)
    axes[1].legend(loc="upper right")
    
    plt.tight_layout()
    out = os.path.join(FIGURES_DIR, "error_analysis.png")
    plt.savefig(out, dpi=300)
    plt.close()
    print(f"[+] Saved {out}")

def main():
    print("=" * 75)
    print("Smart Student Performance: Generating Comprehensive Evaluation Visualizations")
    print("=" * 75)
    
    comp_data, df_test, X_test, y_test, y_test_reg, all_models, best_clf, best_reg, importance_df = load_evaluation_data()
    
    plot_model_comparison_chart(comp_data)
    plot_confusion_matrices(comp_data, all_models, X_test, y_test)
    plot_roc_curves(all_models, X_test, y_test)
    plot_feature_importance(importance_df)
    plot_shap_summary(best_clf, X_test)
    plot_regression_actual_vs_predicted(best_reg, X_test, y_test_reg)
    plot_error_analysis(best_clf, df_test, X_test, y_test)
    
    print("[*] All 7 evaluation visualization figures successfully generated in reports/figures/.")

if __name__ == "__main__":
    main()
