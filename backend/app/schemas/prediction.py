from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator

class PredictionInput(BaseModel):
    student_identifier: Optional[str] = Field(default="STU_NEW_EVAL", description="Student or record reference")
    
    # Academic & Core
    course: Literal["Math", "Portuguese"] = Field(default="Math", description="Academic course subject")
    G1: float = Field(default=12.0, ge=0.0, le=20.0, description="1st period mid-term grade (0 - 20)")
    failures: int = Field(default=0, ge=0, le=4, description="Number of past class failures (0 - 4)")
    absences: int = Field(default=4, ge=0, le=93, description="Recorded school absences (0 - 93)")
    studytime: int = Field(default=2, ge=1, le=4, description="Weekly study time: 1 (<2h), 2 (2-5h), 3 (5-10h), 4 (>10h)")
    schoolsup: Literal["yes", "no"] = Field(default="no", description="Extra educational school support")
    famsup: Literal["yes", "no"] = Field(default="yes", description="Family educational support")
    paid: Literal["yes", "no"] = Field(default="no", description="Extra paid classes in course subject")
    higher: Literal["yes", "no"] = Field(default="yes", description="Aspirations for higher education")
    
    # Demographics & Family
    school: Literal["GP", "MS"] = Field(default="GP", description="School (GP: Gabriel Pereira, MS: Mousinho da Silveira)")
    sex: Literal["F", "M"] = Field(default="F", description="Student sex")
    age: int = Field(default=16, ge=15, le=22, description="Student age in years (15 - 22)")
    address: Literal["U", "R"] = Field(default="U", description="Home address type (U: Urban, R: Rural)")
    famsize: Literal["LE3", "GT3"] = Field(default="GT3", description="Family size (LE3: <=3, GT3: >3)")
    Pstatus: Literal["T", "A"] = Field(default="T", description="Parent cohabitation (T: Together, A: Apart)")
    Medu: int = Field(default=3, ge=0, le=4, description="Mother education level (0: None, 4: Higher)")
    Fedu: int = Field(default=3, ge=0, le=4, description="Father education level (0: None, 4: Higher)")
    Mjob: Literal["teacher", "health", "services", "at_home", "other"] = Field(default="services", description="Mother job sector")
    Fjob: Literal["teacher", "health", "services", "at_home", "other"] = Field(default="services", description="Father job sector")
    reason: Literal["home", "reputation", "course", "other"] = Field(default="course", description="Reason for school choice")
    guardian: Literal["mother", "father", "other"] = Field(default="mother", description="Legal guardian")
    
    # Engagement & Lifestyle
    traveltime: int = Field(default=1, ge=1, le=4, description="Commute time: 1 (<15m), 2 (15-30m), 3 (30-60m), 4 (>60m)")
    activities: Literal["yes", "no"] = Field(default="yes", description="Extracurricular activities")
    nursery: Literal["yes", "no"] = Field(default="yes", description="Attended nursery school")
    internet: Literal["yes", "no"] = Field(default="yes", description="Internet access at home")
    romantic: Literal["yes", "no"] = Field(default="no", description="In a romantic relationship")
    famrel: int = Field(default=4, ge=1, le=5, description="Quality of family relationships (1: Bad, 5: Excellent)")
    freetime: int = Field(default=3, ge=1, le=5, description="Free time after school (1: Low, 5: High)")
    goout: int = Field(default=3, ge=1, le=5, description="Going out with friends (1: Low, 5: High)")
    Dalc: int = Field(default=1, ge=1, le=5, description="Workday alcohol consumption (1: Low, 5: High)")
    Walc: int = Field(default=2, ge=1, le=5, description="Weekend alcohol consumption (1: Low, 5: High)")
    health: int = Field(default=4, ge=1, le=5, description="Current health status (1: Bad, 5: Good)")

class FactorExplanation(BaseModel):
    feature: str
    feature_label: str
    impact: str  # e.g. "Increases Risk" or "Protective / Lowers Risk"
    shap_value: float
    value_display: str

class RecommendationItem(BaseModel):
    priority: Literal["High", "Medium", "Informational"]
    category: str
    title: str
    recommendation: str

class PredictionResponse(BaseModel):
    prediction_id: int
    student_identifier: str
    course: str
    predicted_at_risk: int
    predicted_outcome: str  # "At Risk" or "Pass / Satisfactory"
    risk_probability: float
    confidence_percentage: float
    confidence_level: str
    predicted_grade: float
    risk_tier: str  # "High Risk", "Moderate Risk", "Low Risk"
    contributing_factors: List[FactorExplanation]
    supportive_recommendations: List[RecommendationItem]
    created_at: str
    is_simulated: bool = False

class PredictionHistoryItem(BaseModel):
    id: int
    student_identifier: str
    course: str
    predicted_at_risk: int
    predicted_outcome: str
    risk_probability: float
    predicted_grade: float
    risk_tier: str
    created_at: str
