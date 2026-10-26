from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator

class AssessmentConfig(BaseModel):
    max_internal_marks: float = Field(default=25.0, gt=0, description="Maximum scale for continuous internal assessments")
    max_previous_score: float = Field(default=100.0, gt=0, description="Maximum scale for previous semester/prerequisite score")
    max_assignment_marks: float = Field(default=25.0, gt=0, description="Maximum scale for practical/assignment marks")

class StudentCreateInput(BaseModel):
    dataset_id: int = Field(default=1, description="Target dataset / cohort ID")
    student_id: str = Field(..., min_length=1, max_length=50, description="Unique institutional student roll number or ID")
    student_name: str = Field(..., min_length=1, max_length=100, description="Full student name")
    email: Optional[str] = Field(default=None, description="Student institutional email")
    department: str = Field(..., min_length=1, description="Academic department, e.g. Computer Science")
    course_name: str = Field(..., min_length=1, description="Course / subject enrolled, e.g. Data Structures")
    semester: str = Field(..., min_length=1, description="Semester or term, e.g. Semester 5")
    academic_year: Optional[str] = Field(default="2024-2025", description="Academic year")
    attendance_percentage: float = Field(..., ge=0.0, le=100.0, description="Overall attendance percentage (0.0 to 100.0)")
    
    # Configurable Assessments
    previous_score: float = Field(..., ge=0.0, description="Previous semester/prerequisite marks")
    max_previous_score: float = Field(default=100.0, gt=0.0, description="Max possible previous score")
    internal_marks: float = Field(..., ge=0.0, description="Current internal assessment score")
    max_internal_marks: float = Field(default=25.0, gt=0.0, description="Max possible internal marks")
    assignment_marks: float = Field(default=0.0, ge=0.0, description="Assignments / lab marks")
    max_assignment_marks: float = Field(default=25.0, gt=0.0, description="Max possible assignment marks")
    
    study_hours_per_week: float = Field(default=5.0, ge=0.0, le=80.0, description="Average study hours per week")
    failures: int = Field(default=0, ge=0, le=4, description="Prior subject backlogs or failures (0 to 4)")
    observed_final_score: Optional[float] = Field(default=None, ge=0.0, description="Actual recorded final grade if completed")
    additional_attributes: Optional[Dict[str, Any]] = Field(default=None, description="Optional demographic or lifestyle factors")

    @model_validator(mode="after")
    def validate_marks_within_limits(self):
        if self.internal_marks > self.max_internal_marks:
            raise ValueError(f"Internal marks ({self.internal_marks}) cannot exceed maximum internal marks ({self.max_internal_marks}).")
        if self.previous_score > self.max_previous_score:
            raise ValueError(f"Previous score ({self.previous_score}) cannot exceed maximum previous score ({self.max_previous_score}).")
        if self.assignment_marks > self.max_assignment_marks:
            raise ValueError(f"Assignment marks ({self.assignment_marks}) cannot exceed maximum assignment marks ({self.max_assignment_marks}).")
        return self

class StudentUpdateInput(BaseModel):
    student_name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    course_name: Optional[str] = None
    semester: Optional[str] = None
    academic_year: Optional[str] = None
    attendance_percentage: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    previous_score: Optional[float] = Field(default=None, ge=0.0)
    max_previous_score: Optional[float] = Field(default=None, gt=0.0)
    internal_marks: Optional[float] = Field(default=None, ge=0.0)
    max_internal_marks: Optional[float] = Field(default=None, gt=0.0)
    assignment_marks: Optional[float] = Field(default=None, ge=0.0)
    max_assignment_marks: Optional[float] = Field(default=None, gt=0.0)
    study_hours_per_week: Optional[float] = Field(default=None, ge=0.0, le=80.0)
    failures: Optional[int] = Field(default=None, ge=0, le=4)
    observed_final_score: Optional[float] = Field(default=None, ge=0.0)
    additional_attributes: Optional[Dict[str, Any]] = None

    @model_validator(mode="after")
    def validate_marks(self):
        if self.internal_marks is not None and self.max_internal_marks is not None:
            if self.internal_marks > self.max_internal_marks:
                raise ValueError("Internal marks cannot exceed maximum internal marks.")
        if self.previous_score is not None and self.max_previous_score is not None:
            if self.previous_score > self.max_previous_score:
                raise ValueError("Previous score cannot exceed maximum previous score.")
        if self.assignment_marks is not None and self.max_assignment_marks is not None:
            if self.assignment_marks > self.max_assignment_marks:
                raise ValueError("Assignment marks cannot exceed maximum assignment marks.")
        return self

class StudentResponse(BaseModel):
    id: int
    dataset_id: int
    student_id: str
    student_name: str
    email: Optional[str]
    department: str
    course_name: str
    semester: str
    academic_year: Optional[str]
    attendance_percentage: float
    previous_score: float
    max_previous_score: float
    internal_marks: float
    max_internal_marks: float
    assignment_marks: float
    max_assignment_marks: float
    study_hours_per_week: float
    failures: int
    observed_final_score: Optional[float]
    observed_at_risk: Optional[int]
    scaled_g1_score: float
    calculated_absences: int
    latest_prediction: Optional[Dict[str, Any]] = None
    created_at: str
    updated_at: str

class DatasetCreateInput(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Dataset or cohort title")
    description: Optional[str] = Field(default="", description="Description of the cohort or source")
    department: Optional[str] = Field(default="All Departments", description="Primary department")
    semester: Optional[str] = Field(default="Semester 1", description="Semester / term")
    academic_year: Optional[str] = Field(default="2024-2025", description="Academic year")

class DatasetResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    department: Optional[str]
    semester: Optional[str]
    academic_year: Optional[str]
    is_system_benchmark: int
    student_count: int
    created_at: str

class UploadPreviewResponse(BaseModel):
    filename: str
    file_type: str
    total_rows: int
    detected_columns: List[str]
    preview_rows: List[Dict[str, Any]]
    suggested_mapping: Dict[str, str]

class RowValidationError(BaseModel):
    row_index: int
    student_id: Optional[str] = None
    field: str
    message: str
    value: Any = None

class ValidationRequest(BaseModel):
    dataset_id: int
    rows: List[Dict[str, Any]]
    column_mapping: Dict[str, str]
    assessment_config: AssessmentConfig
    duplicate_policy: Optional[str] = Field(default="skip", description="Policy for handling duplicate student IDs: skip, update, or reject")

class ValidationResponse(BaseModel):
    total_records: int
    valid_records: int
    invalid_records: int
    errors: List[RowValidationError]
    preview_mapped_rows: List[Dict[str, Any]]

class ImportRequest(BaseModel):
    dataset_id: int
    filename: str
    rows: List[Dict[str, Any]]
    column_mapping: Dict[str, str]
    assessment_config: AssessmentConfig
    skip_invalid: bool = True
    duplicate_policy: Optional[str] = Field(default="skip", description="Policy for duplicate student IDs: skip, update, or reject")

class ImportResponse(BaseModel):
    dataset_id: int
    total_processed: int
    imported_count: int
    skipped_count: int
    errors: List[RowValidationError]

class BatchPredictRequest(BaseModel):
    dataset_id: int
    student_ids: Optional[List[int]] = None

class BatchPredictResponse(BaseModel):
    dataset_id: int
    total_predicted: int
    high_risk_count: int
    moderate_risk_count: int
    low_risk_count: int
    results: List[Dict[str, Any]]
