import os
import json
import joblib
import pandas as pd
import numpy as np
import shap

from backend.app.core.config import settings
from backend.app.schemas.prediction import PredictionInput, FactorExplanation

FEATURE_FRIENDLY_NAMES = {
    "G1": "Mid-term Exam Grade (G1)",
    "failures": "Prior Course Failures",
    "absences": "Recorded Absences",
    "studytime": "Weekly Dedicated Study Time",
    "age": "Student Age",
    "Medu": "Mother's Education Level",
    "Fedu": "Father's Education Level",
    "goout": "Peer Socializing Frequency",
    "Dalc": "Workday Alcohol Consumption",
    "Walc": "Weekend Alcohol Consumption",
    "traveltime": "Commute Travel Time",
    "famrel": "Family Relationship Quality",
    "freetime": "Free Time After School",
    "health": "Current Health Status",
    "schoolsup": "School Remedial Support",
    "higher": "Higher Education Plans",
    "paid": "Paid Subject Tutoring",
    "course": "Course Subject"
}

class MLService:
    def __init__(self):
        self.classifier = None
        self.regressor = None
        self.metadata = None
        self.schema = None
        self.shap_explainer = None
        self.background_sample = None
        self.transformed_feature_names = None
        self.is_loaded = False
        self.load_models()

    def load_models(self):
        """Safely load trained model artifacts and explainers."""
        clf_path = os.path.join(settings.MODELS_DIR, "best_classifier_pipeline.joblib")
        reg_path = os.path.join(settings.MODELS_DIR, "best_regressor_pipeline.joblib")
        meta_path = os.path.join(settings.MODELS_DIR, "model_metadata.json")
        schema_path = os.path.join(settings.MODELS_DIR, "feature_schema.json")
        shap_path = os.path.join(settings.MODELS_DIR, "shap_background_sample.joblib")
        
        if not os.path.exists(clf_path) or not os.path.exists(reg_path):
            raise FileNotFoundError("Model artifacts not found in models/ directory. Run scripts/train_models.py first.")
            
        self.classifier = joblib.load(clf_path)
        self.regressor = joblib.load(reg_path)
        
        with open(meta_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)
            
        with open(schema_path, "r", encoding="utf-8") as f:
            self.schema = json.load(f)
            
        if os.path.exists(shap_path):
            shap_data = joblib.load(shap_path)
            self.background_sample = shap_data["sample_background"]
            self.transformed_feature_names = shap_data["feature_names"]
            
            # Setup TreeExplainer for the Random Forest step
            clf_step = self.classifier.named_steps["classifier"]
            self.shap_explainer = shap.TreeExplainer(clf_step)
            
        self.is_loaded = True
        print("[+] MLService successfully loaded model pipelines and SHAP explainers.")

    def predict(self, input_data: PredictionInput):
        """Execute prediction, confidence estimation, continuous grade, and local SHAP explanations."""
        if not self.is_loaded:
            self.load_models()
            
        # Convert Pydantic input to single-row DataFrame with exact predictor list
        raw_dict = input_data.model_dump()
        predictors = self.schema["predictors"]
        df_row = pd.DataFrame([{k: raw_dict[k] for k in predictors}])
        
        # 1. Classification (At-Risk prediction & probability)
        pred_class = int(self.classifier.predict(df_row)[0])
        probabilities = self.classifier.predict_proba(df_row)[0]
        risk_prob = float(probabilities[1])
        
        # 2. Continuous Final Grade prediction
        pred_grade = float(self.regressor.predict(df_row)[0])
        pred_grade = max(0.0, min(20.0, round(pred_grade, 1)))
        
        # 3. Risk Tier & Confidence Level
        if pred_grade < 10.0 or risk_prob >= 0.65:
            risk_tier = "High Risk"
        elif pred_grade < 14.0 or risk_prob >= 0.35:
            risk_tier = "Moderate Risk"
        else:
            risk_tier = "Low Risk"
            
        # Confidence interpretation based on distance from decision boundary (0.50)
        margin = abs(risk_prob - 0.50)
        if margin >= 0.25:
            confidence_level = "High"
            conf_pct = round(max(risk_prob, 1 - risk_prob) * 100, 1)
        elif margin >= 0.10:
            confidence_level = "Moderate"
            conf_pct = round(max(risk_prob, 1 - risk_prob) * 100, 1)
        else:
            confidence_level = "Low"
            conf_pct = round(max(risk_prob, 1 - risk_prob) * 100, 1)

        # 4. Local Instance Explanation (SHAP)
        factors = self._compute_local_explanation(df_row, raw_dict)
        
        return {
            "predicted_at_risk": pred_class,
            "predicted_outcome": "At Risk" if pred_class == 1 else "Pass / Satisfactory",
            "risk_probability": round(risk_prob, 4),
            "confidence_percentage": conf_pct,
            "confidence_level": confidence_level,
            "predicted_grade": pred_grade,
            "risk_tier": risk_tier,
            "contributing_factors": factors
        }

    def _compute_local_explanation(self, df_row: pd.DataFrame, raw_dict: dict):
        """Compute instance SHAP values and map to human-understandable factor explanations."""
        factors = []
        if self.shap_explainer is None:
            return factors
            
        try:
            preprocessor = self.classifier.named_steps["preprocessor"]
            X_trans = preprocessor.transform(df_row)
            
            # Compute shap values
            shap_vals = self.shap_explainer.shap_values(X_trans)
            if isinstance(shap_vals, list):
                sv_class1 = shap_vals[1][0]
            elif len(shap_vals.shape) == 3:
                sv_class1 = shap_vals[0, :, 1]
            else:
                sv_class1 = shap_vals[0]
                
            # Aggregate one-hot components back to raw features
            raw_contribs = {}
            for name, sv in zip(self.transformed_feature_names, sv_class1):
                clean_name = name.replace("num__", "").replace("cat__", "").split("_")[0]
                raw_contribs[clean_name] = raw_contribs.get(clean_name, 0.0) + float(sv)
                
            # Sort by absolute impact
            sorted_feats = sorted(raw_contribs.items(), key=lambda x: abs(x[1]), reverse=True)
            
            for feat, val in sorted_feats[:5]:
                friendly = FEATURE_FRIENDLY_NAMES.get(feat, feat.replace("_", " ").title())
                raw_val = raw_dict.get(feat, "N/A")
                impact = "Increases Risk" if val > 0 else "Protective / Lowers Risk"
                
                # Format friendly display value
                if feat == "G1":
                    val_disp = f"{raw_val} / 20"
                elif feat == "studytime":
                    study_map = {1: "< 2 hrs/wk", 2: "2 - 5 hrs/wk", 3: "5 - 10 hrs/wk", 4: "> 10 hrs/wk"}
                    val_disp = study_map.get(raw_val, str(raw_val))
                elif feat == "failures":
                    val_disp = f"{raw_val} past failure(s)"
                elif feat == "absences":
                    val_disp = f"{raw_val} days"
                else:
                    val_disp = str(raw_val)
                    
                factors.append(FactorExplanation(
                    feature=feat,
                    feature_label=friendly,
                    impact=impact,
                    shap_value=round(val, 4),
                    value_display=val_disp
                ))
        except Exception as e:
            print(f"[!] Warning during local SHAP explanation: {e}")
            
        return factors

ml_service = MLService()
