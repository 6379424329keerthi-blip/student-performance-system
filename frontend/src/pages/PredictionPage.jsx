import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  BookmarkPlus,
  RefreshCw,
  Award,
  BookOpen,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  Database,
  Users,
  Layers,
  ChevronDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import api from '../services/api';
import { useDataset } from '../context/DatasetContext';

const PRESET_HIGH_RISK = {
  student_identifier: 'DEMO_AT_RISK_STU',
  course: 'Math',
  G1: 6.0,
  failures: 2,
  absences: 14,
  studytime: 1,
  schoolsup: 'no',
  famsup: 'no',
  paid: 'no',
  higher: 'no',
  school: 'GP',
  sex: 'M',
  age: 18,
  address: 'R',
  famsize: 'GT3',
  Pstatus: 'A',
  Medu: 1,
  Fedu: 1,
  Mjob: 'other',
  Fjob: 'other',
  reason: 'course',
  guardian: 'other',
  traveltime: 3,
  activities: 'no',
  nursery: 'no',
  internet: 'no',
  romantic: 'yes',
  famrel: 2,
  freetime: 4,
  goout: 4,
  Dalc: 3,
  Walc: 4,
  health: 3
};

const PRESET_BORDERLINE = {
  student_identifier: 'DEMO_BORDERLINE_STU',
  course: 'Math',
  G1: 10.0,
  failures: 0,
  absences: 6,
  studytime: 2,
  schoolsup: 'no',
  famsup: 'yes',
  paid: 'no',
  higher: 'yes',
  school: 'GP',
  sex: 'F',
  age: 16,
  address: 'U',
  famsize: 'GT3',
  Pstatus: 'T',
  Medu: 2,
  Fedu: 2,
  Mjob: 'services',
  Fjob: 'services',
  reason: 'home',
  guardian: 'mother',
  traveltime: 1,
  activities: 'yes',
  nursery: 'yes',
  internet: 'yes',
  romantic: 'no',
  famrel: 4,
  freetime: 3,
  goout: 3,
  Dalc: 1,
  Walc: 2,
  health: 4
};

const PRESET_HIGH_ACHIEVER = {
  student_identifier: 'DEMO_HONORS_STU',
  course: 'Portuguese',
  G1: 16.5,
  failures: 0,
  absences: 2,
  studytime: 3,
  schoolsup: 'no',
  famsup: 'yes',
  paid: 'no',
  higher: 'yes',
  school: 'GP',
  sex: 'F',
  age: 15,
  address: 'U',
  famsize: 'LE3',
  Pstatus: 'T',
  Medu: 4,
  Fedu: 4,
  Mjob: 'teacher',
  Fjob: 'health',
  reason: 'reputation',
  guardian: 'mother',
  traveltime: 1,
  activities: 'yes',
  nursery: 'yes',
  internet: 'yes',
  romantic: 'no',
  famrel: 5,
  freetime: 2,
  goout: 2,
  Dalc: 1,
  Walc: 1,
  health: 5
};

export default function PredictionPage({ initialFormData }) {
  const { activeDatasetId, isBenchmark, activeDataset, refreshDatasets } = useDataset();

  // Mode Selection: Benchmark vs College Cohort
  // Form State for UCI Benchmark
  const [formData, setFormData] = useState(initialFormData || PRESET_BORDERLINE);
  const [activeTab, setActiveTab] = useState('academic');

  // College Student Cohort Prediction State
  const [cohortStudents, setCohortStudents] = useState([]);
  const [selectedStudentPk, setSelectedStudentPk] = useState('');
  const [collegeFormData, setCollegeFormData] = useState({
    student_id: 'COLLEGE_STU_001',
    student_name: 'Custom Evaluation Student',
    department: 'Computer Science',
    course_name: 'Core Curriculum',
    semester: 'Semester 4',
    attendance_percentage: 85.0,
    internal_marks: 80.0,
    max_internal_marks: 100.0,
    previous_score: 75.0,
    max_previous_score: 100.0,
    assignment_marks: 85.0,
    max_assignment_marks: 100.0,
    study_hours_per_week: 6.0,
    failures: 0,
    gender: 'M',
    family_support: 'yes',
    higher_education: 'yes',
    internet_access: 'yes'
  });

  // Inference & Results State
  const [predictionResult, setPredictionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Batch Prediction State
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState(null);

  // Load cohort students when college dataset is active
  useEffect(() => {
    if (!isBenchmark && activeDatasetId && activeDatasetId !== 'uci') {
      loadCohortStudents();
    }
  }, [activeDatasetId, isBenchmark]);

  // Handle passed initialFormData
  useEffect(() => {
    if (initialFormData) {
      if (initialFormData.internal_marks !== undefined || initialFormData.student_name) {
        // Passed college student
        setCollegeFormData((prev) => ({
          ...prev,
          ...initialFormData
        }));
        if (initialFormData.id) {
          setSelectedStudentPk(String(initialFormData.id));
        }
      } else {
        // Passed benchmark student
        setFormData(initialFormData);
      }
    }
  }, [initialFormData]);

  const loadCohortStudents = async () => {
    try {
      const res = await api.getCollegeStudents({
        dataset_id: Number(activeDatasetId),
        page: 1,
        limit: 100
      });
      setCohortStudents(res.records || []);
    } catch (e) {
      console.error('Failed to load cohort students for picker:', e);
    }
  };

  const handleSelectCohortStudent = (pkStr) => {
    setSelectedStudentPk(pkStr);
    setPredictionResult(null);
    setError(null);
    if (!pkStr) return;

    const stu = cohortStudents.find((s) => String(s.id) === pkStr);
    if (stu) {
      setCollegeFormData({
        student_id: stu.student_id,
        student_name: stu.student_name,
        department: stu.department || 'General',
        course_name: stu.course_name || 'Curriculum',
        semester: stu.semester || 'Semester 1',
        attendance_percentage: stu.attendance_percentage,
        internal_marks: stu.internal_marks,
        max_internal_marks: stu.max_internal_marks || 100.0,
        previous_score: stu.previous_score,
        max_previous_score: stu.max_previous_score || 100.0,
        assignment_marks: stu.assignment_marks,
        max_assignment_marks: stu.max_assignment_marks || 100.0,
        study_hours_per_week: stu.study_hours_per_week,
        failures: stu.failures,
        gender: stu.gender || 'M',
        family_support: 'yes',
        higher_education: 'yes',
        internet_access: 'yes'
      });

      if (stu.latest_prediction) {
        setPredictionResult({
          predicted_at_risk: stu.latest_prediction.predicted_at_risk,
          predicted_outcome: stu.latest_prediction.predicted_outcome,
          risk_probability: stu.latest_prediction.risk_probability,
          confidence_percentage: stu.latest_prediction.confidence_percentage,
          confidence_level: stu.latest_prediction.confidence_level,
          predicted_grade: stu.latest_prediction.predicted_grade,
          risk_tier: stu.latest_prediction.risk_tier,
          contributing_factors: stu.latest_prediction.shap_factors || [],
          supportive_recommendations: stu.latest_prediction.recommendations || []
        });
      }
    }
  };

  // Benchmark handlers
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumericChange = (field, value) => {
    const num = parseFloat(value);
    setFormData((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : num }));
  };

  const handleApplyPreset = (preset) => {
    setFormData(preset);
    setPredictionResult(null);
    setError(null);
  };

  // College Form handlers
  const handleCollegeChange = (field, value) => {
    setCollegeFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCollegeNumericChange = (field, value) => {
    const num = parseFloat(value);
    setCollegeFormData((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : num }));
  };

  // Form Submissions
  const handleBenchmarkSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.predictStudent(formData);
      setPredictionResult(res);
    } catch (err) {
      setError(err.message || 'Prediction inference failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCollegeSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (selectedStudentPk) {
        // Student exists in DB
        const res = await api.predictCollegeStudent(Number(selectedStudentPk));
        setPredictionResult(res);
        refreshDatasets();
      } else {
        // Custom student: map to safe prediction input
        const safeMaxInt = collegeFormData.max_internal_marks > 0 ? collegeFormData.max_internal_marks : 100.0;
        const safeMaxPrev = collegeFormData.max_previous_score > 0 ? collegeFormData.max_previous_score : 100.0;
        const safeMaxAssign = collegeFormData.max_assignment_marks > 0 ? collegeFormData.max_assignment_marks : 100.0;

        const normInt = Math.min(1.0, Math.max(0.0, collegeFormData.internal_marks / safeMaxInt));
        const normPrev = Math.min(1.0, Math.max(0.0, collegeFormData.previous_score / safeMaxPrev));
        const normAssign = Math.min(1.0, Math.max(0.0, collegeFormData.assignment_marks / safeMaxAssign));
        const compositeRatio = (0.50 * normInt) + (0.35 * normPrev) + (0.15 * normAssign);
        const scaledG1 = Math.max(0.0, Math.min(20.0, Math.round(compositeRatio * 20.0 * 10) / 10));

        const missRatio = (100.0 - Math.max(0.0, Math.min(100.0, collegeFormData.attendance_percentage))) / 100.0;
        const calculatedAbsences = Math.max(0, Math.min(93, Math.round(missRatio * 40.0)));

        let studyTier = 2;
        if (collegeFormData.study_hours_per_week < 2.0) studyTier = 1;
        else if (collegeFormData.study_hours_per_week < 5.0) studyTier = 2;
        else if (collegeFormData.study_hours_per_week < 10.0) studyTier = 3;
        else studyTier = 4;

        const payload = {
          student_identifier: collegeFormData.student_id,
          course: 'Math',
          G1: scaledG1,
          failures: Math.min(4, Math.max(0, parseInt(collegeFormData.failures || 0))),
          absences: calculatedAbsences,
          studytime: studyTier,
          schoolsup: 'no',
          famsup: collegeFormData.family_support || 'yes',
          paid: 'no',
          higher: collegeFormData.higher_education || 'yes',
          school: 'GP',
          sex: collegeFormData.gender || 'M',
          age: 18,
          address: 'U',
          famsize: 'GT3',
          Pstatus: 'T',
          Medu: 3,
          Fedu: 3,
          Mjob: 'other',
          Fjob: 'other',
          reason: 'course',
          guardian: 'mother',
          traveltime: 1,
          activities: 'yes',
          nursery: 'yes',
          internet: collegeFormData.internet_access || 'yes',
          romantic: 'no',
          famrel: 4,
          freetime: 3,
          goout: 3,
          Dalc: 1,
          Walc: 1,
          health: 4
        };

        const res = await api.predictStudent(payload);
        setPredictionResult(res);
      }
    } catch (err) {
      setError(err.message || 'College student prediction failed.');
    } finally {
      setLoading(false);
    }
  };

  // Batch Predict Cohort
  const handleBatchPredictCohort = async () => {
    if (!window.confirm(`Run batch machine learning prediction across all students in "${activeDataset.name}"?`)) {
      return;
    }
    setBatchLoading(true);
    setBatchResult(null);
    setError(null);
    try {
      const res = await api.batchPredictCollegeStudents({
        dataset_id: Number(activeDatasetId)
      });
      setBatchResult(res);
      refreshDatasets();
      loadCohortStudents();
    } catch (err) {
      setError(err.message || 'Batch prediction failed.');
    } finally {
      setBatchLoading(false);
    }
  };

  // Real-time transfer calculation for College Form
  const calcSafeMaxInt = collegeFormData.max_internal_marks > 0 ? collegeFormData.max_internal_marks : 100.0;
  const calcSafeMaxPrev = collegeFormData.max_previous_score > 0 ? collegeFormData.max_previous_score : 100.0;
  const calcSafeMaxAssign = collegeFormData.max_assignment_marks > 0 ? collegeFormData.max_assignment_marks : 100.0;
  const cNormInt = Math.min(1.0, Math.max(0.0, collegeFormData.internal_marks / calcSafeMaxInt));
  const cNormPrev = Math.min(1.0, Math.max(0.0, collegeFormData.previous_score / calcSafeMaxPrev));
  const cNormAssign = Math.min(1.0, Math.max(0.0, collegeFormData.assignment_marks / calcSafeMaxAssign));
  const cCompRatio = (0.50 * cNormInt) + (0.35 * cNormPrev) + (0.15 * cNormAssign);
  const liveScaledG1 = Math.max(0.0, Math.min(20.0, Math.round(cCompRatio * 20.0 * 10) / 10));
  const liveAbsences = Math.max(0, Math.min(93, Math.round(((100.0 - Math.min(100.0, Math.max(0.0, collegeFormData.attendance_percentage))) / 100.0) * 40.0)));

  // SHAP Chart data
  const shapData = predictionResult?.contributing_factors?.map((f) => ({
    name: f.feature_label || f.feature,
    impact: Math.round(f.shap_value * 1000) / 1000,
    direction: f.impact,
    display: f.value_display
  })) || [];

  return (
    <div>
      {/* Top Banner: Context & Presets / Batch Actions */}
      <div className="card" style={{ marginBottom: 20, background: '#f8fafc', padding: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={18} color="#2563eb" />
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                Active Evaluation Context: {activeDataset?.name || 'Dataset'}
              </span>
              <span className={`badge ${isBenchmark ? 'badge-info' : 'badge-pass'}`} style={{ marginLeft: 8 }}>
                {isBenchmark ? 'Benchmark Standard' : 'College Cohort'}
              </span>
            </div>
          </div>

          {/* Action Controls */}
          {isBenchmark ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ borderLeft: '3px solid #dc2626' }}
                onClick={() => handleApplyPreset(PRESET_HIGH_RISK)}
              >
                Preset: High Academic Risk
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ borderLeft: '3px solid #d97706' }}
                onClick={() => handleApplyPreset(PRESET_BORDERLINE)}
              >
                Preset: Borderline / Vulnerable
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ borderLeft: '3px solid #059669' }}
                onClick={() => handleApplyPreset(PRESET_HIGH_ACHIEVER)}
              >
                Preset: High-Achieving Student
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
                onClick={handleBatchPredictCohort}
                disabled={batchLoading}
              >
                <Sparkles size={14} />
                {batchLoading ? 'Evaluating Entire Cohort...' : 'Batch Predict Cohort'}
              </button>
            </div>
          )}
        </div>

        {/* Batch Prediction Banner Result */}
        {batchResult && (
          <div style={{
            marginTop: 14,
            padding: 12,
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 13,
            color: '#166534'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={18} color="#166534" />
              <span>
                <strong>Cohort Batch Evaluation Complete:</strong> Scored {batchResult.total_predicted} students. Result: <strong>{batchResult.high_risk_count} High Risk</strong>, <strong>{batchResult.moderate_risk_count} Moderate Risk</strong>, <strong>{batchResult.low_risk_count} Low Risk</strong>.
              </span>
            </div>
            <button
              onClick={() => setBatchResult(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#166534', fontWeight: 700 }}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Input Form & Results */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 24, alignItems: 'start' }}>
        
        {/* ======================= FORM SECTION ======================= */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <BrainCircuit size={17} color="#2563eb" />
                {isBenchmark ? 'Student Benchmark Profile Form' : 'College Cohort Student Evaluation'}
              </div>
              <div className="card-subtitle">
                {isBenchmark
                  ? '32 features mapped to tuned Random Forest classifier'
                  : 'Multi-component assessments scaled safely with zero target leakage'}
              </div>
            </div>
            <span className="badge badge-info">Zero Leakage: Final Grade Excluded</span>
          </div>

          {/* If College Cohort: Cohort Student Picker */}
          {!isBenchmark && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', display: 'block', marginBottom: 6 }}>
                Select Student from Active Cohort ({cohortStudents.length} Available):
              </label>
              <select
                className="form-select"
                value={selectedStudentPk}
                onChange={(e) => handleSelectCohortStudent(e.target.value)}
                style={{ width: '100%', fontSize: 13 }}
              >
                <option value="">-- Or enter custom student profile below --</option>
                {cohortStudents.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.student_id} - {s.student_name} ({s.department}) | CIE: {s.internal_marks}/{s.max_internal_marks} | Att: {s.attendance_percentage}%
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Form Tabs (Benchmark Mode) */}
          {isBenchmark ? (
            <>
              <div className="tabs-header">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'academic' ? 'active' : ''}`}
                  onClick={() => setActiveTab('academic')}
                >
                  1. Core Academic
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'demographics' ? 'active' : ''}`}
                  onClick={() => setActiveTab('demographics')}
                >
                  2. Demographics & Family
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'lifestyle' ? 'active' : ''}`}
                  onClick={() => setActiveTab('lifestyle')}
                >
                  3. Study & Lifestyle
                </button>
              </div>

              <form onSubmit={handleBenchmarkSubmit}>
                {activeTab === 'academic' && (
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">
                        Student Identifier
                        <span className="form-hint">Unique label</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.student_identifier}
                        onChange={(e) => handleChange('student_identifier', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Course Subject</label>
                      <select
                        className="form-select"
                        value={formData.course}
                        onChange={(e) => handleChange('course', e.target.value)}
                      >
                        <option value="Math">Mathematics</option>
                        <option value="Portuguese">Portuguese Language</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Mid-term Grade (G1)
                        <span className="form-hint">Scale 0 - 20</span>
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="20"
                        className="form-input"
                        value={formData.G1}
                        onChange={(e) => handleNumericChange('G1', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Prior Failures
                        <span className="form-hint">0 to 4+</span>
                      </label>
                      <select
                        className="form-select"
                        value={formData.failures}
                        onChange={(e) => handleNumericChange('failures', e.target.value)}
                      >
                        <option value={0}>0 Failures</option>
                        <option value={1}>1 Failure</option>
                        <option value={2}>2 Failures</option>
                        <option value={3}>3 Failures</option>
                        <option value={4}>4+ Failures</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Recorded Absences
                        <span className="form-hint">Days absent</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="93"
                        className="form-input"
                        value={formData.absences}
                        onChange={(e) => handleNumericChange('absences', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Weekly Study Time</label>
                      <select
                        className="form-select"
                        value={formData.studytime}
                        onChange={(e) => handleNumericChange('studytime', e.target.value)}
                      >
                        <option value={1}>1: Less than 2 hours</option>
                        <option value={2}>2: 2 to 5 hours</option>
                        <option value={3}>3: 5 to 10 hours</option>
                        <option value={4}>4: More than 10 hours</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Extra School Support</label>
                      <select
                        className="form-select"
                        value={formData.schoolsup}
                        onChange={(e) => handleChange('schoolsup', e.target.value)}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Family Educational Support</label>
                      <select
                        className="form-select"
                        value={formData.famsup}
                        onChange={(e) => handleChange('famsup', e.target.value)}
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                  </div>
                )}

                {activeTab === 'demographics' && (
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Student Sex</label>
                      <select
                        className="form-select"
                        value={formData.sex}
                        onChange={(e) => handleChange('sex', e.target.value)}
                      >
                        <option value="F">Female</option>
                        <option value="M">Male</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Age (Years)</label>
                      <input
                        type="number"
                        min="15"
                        max="22"
                        className="form-input"
                        value={formData.age}
                        onChange={(e) => handleNumericChange('age', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Mother's Education (Medu)</label>
                      <select
                        className="form-select"
                        value={formData.Medu}
                        onChange={(e) => handleNumericChange('Medu', e.target.value)}
                      >
                        <option value={0}>0: None</option>
                        <option value={1}>1: Primary education (4th grade)</option>
                        <option value={2}>2: 5th to 9th grade</option>
                        <option value={3}>3: Secondary education</option>
                        <option value={4}>4: Higher education</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Father's Education (Fedu)</label>
                      <select
                        className="form-select"
                        value={formData.Fedu}
                        onChange={(e) => handleNumericChange('Fedu', e.target.value)}
                      >
                        <option value={0}>0: None</option>
                        <option value={1}>1: Primary education</option>
                        <option value={2}>2: 5th to 9th grade</option>
                        <option value={3}>3: Secondary education</option>
                        <option value={4}>4: Higher education</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Aspires to Higher Education</label>
                      <select
                        className="form-select"
                        value={formData.higher}
                        onChange={(e) => handleChange('higher', e.target.value)}
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Home Internet Access</label>
                      <select
                        className="form-select"
                        value={formData.internet}
                        onChange={(e) => handleChange('internet', e.target.value)}
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                  </div>
                )}

                {activeTab === 'lifestyle' && (
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Free Time After School (1-5)</label>
                      <select
                        className="form-select"
                        value={formData.freetime}
                        onChange={(e) => handleNumericChange('freetime', e.target.value)}
                      >
                        <option value={1}>1: Very Low</option>
                        <option value={2}>2: Low</option>
                        <option value={3}>3: Medium</option>
                        <option value={4}>4: High</option>
                        <option value={5}>5: Very High</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Going Out with Friends (1-5)</label>
                      <select
                        className="form-select"
                        value={formData.goout}
                        onChange={(e) => handleNumericChange('goout', e.target.value)}
                      >
                        <option value={1}>1: Very Low</option>
                        <option value={2}>2: Low</option>
                        <option value={3}>3: Medium</option>
                        <option value={4}>4: High</option>
                        <option value={5}>5: Very High</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Current Health Status (1-5)</label>
                      <select
                        className="form-select"
                        value={formData.health}
                        onChange={(e) => handleNumericChange('health', e.target.value)}
                      >
                        <option value={1}>1: Very Bad</option>
                        <option value={2}>2: Bad</option>
                        <option value={3}>3: Normal</option>
                        <option value={4}>4: Good</option>
                        <option value={5}>5: Very Good</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Family Relationship Quality (1-5)</label>
                      <select
                        className="form-select"
                        value={formData.famrel}
                        onChange={(e) => handleNumericChange('famrel', e.target.value)}
                      >
                        <option value={1}>1: Very Bad</option>
                        <option value={2}>2: Poor</option>
                        <option value={3}>3: Normal</option>
                        <option value={4}>4: Good</option>
                        <option value={5}>5: Excellent</option>
                      </select>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    <Sparkles size={16} />
                    {loading ? 'Executing ML Inference...' : 'Run Performance Prediction'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* College Cohort Form */
            <form onSubmit={handleCollegeSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    Student Roll Number / ID
                    <span className="form-hint">Unique identifier</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={collegeFormData.student_id}
                    onChange={(e) => handleCollegeChange('student_id', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Student Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={collegeFormData.student_name}
                    onChange={(e) => handleCollegeChange('student_name', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department / Branch</label>
                  <input
                    type="text"
                    className="form-input"
                    value={collegeFormData.department}
                    onChange={(e) => handleCollegeChange('department', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Continuous Internal Evaluation (CIE) Marks
                    <span className="form-hint">Max: {collegeFormData.max_internal_marks}</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={collegeFormData.max_internal_marks}
                      className="form-input"
                      value={collegeFormData.internal_marks}
                      onChange={(e) => handleCollegeNumericChange('internal_marks', e.target.value)}
                      required
                    />
                    <span style={{ alignSelf: 'center', fontSize: 13, color: '#64748b' }}>/</span>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      style={{ width: 80 }}
                      value={collegeFormData.max_internal_marks}
                      onChange={(e) => handleCollegeNumericChange('max_internal_marks', e.target.value)}
                      title="Max Internal Marks"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Previous Semester / Qualifying Score
                    <span className="form-hint">Max: {collegeFormData.max_previous_score}</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={collegeFormData.max_previous_score}
                      className="form-input"
                      value={collegeFormData.previous_score}
                      onChange={(e) => handleCollegeNumericChange('previous_score', e.target.value)}
                      required
                    />
                    <span style={{ alignSelf: 'center', fontSize: 13, color: '#64748b' }}>/</span>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      style={{ width: 80 }}
                      value={collegeFormData.max_previous_score}
                      onChange={(e) => handleCollegeNumericChange('max_previous_score', e.target.value)}
                      title="Max Previous Score"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Assignment / Lab Marks
                    <span className="form-hint">Max: {collegeFormData.max_assignment_marks}</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={collegeFormData.max_assignment_marks}
                      className="form-input"
                      value={collegeFormData.assignment_marks}
                      onChange={(e) => handleCollegeNumericChange('assignment_marks', e.target.value)}
                      required
                    />
                    <span style={{ alignSelf: 'center', fontSize: 13, color: '#64748b' }}>/</span>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      style={{ width: 80 }}
                      value={collegeFormData.max_assignment_marks}
                      onChange={(e) => handleCollegeNumericChange('max_assignment_marks', e.target.value)}
                      title="Max Assignment Marks"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Attendance Percentage (%)
                    <span className="form-hint">Threshold &ge; 75%</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="form-input"
                    value={collegeFormData.attendance_percentage}
                    onChange={(e) => handleCollegeNumericChange('attendance_percentage', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Weekly Self-Study Time (Hours)
                    <span className="form-hint">Hours per week</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="60"
                    className="form-input"
                    value={collegeFormData.study_hours_per_week}
                    onChange={(e) => handleCollegeNumericChange('study_hours_per_week', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Standing Backlogs / Arrears
                    <span className="form-hint">Past un-cleared subjects</span>
                  </label>
                  <select
                    className="form-select"
                    value={collegeFormData.failures}
                    onChange={(e) => handleCollegeNumericChange('failures', e.target.value)}
                  >
                    <option value={0}>0 Backlogs (Clean record)</option>
                    <option value={1}>1 Standing Backlog</option>
                    <option value={2}>2 Standing Backlogs</option>
                    <option value={3}>3 Standing Backlogs</option>
                    <option value={4}>4+ Standing Backlogs</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Aspiration for Higher Studies</label>
                  <select
                    className="form-select"
                    value={collegeFormData.higher_education}
                    onChange={(e) => handleCollegeChange('higher_education', e.target.value)}
                  >
                    <option value="yes">Yes (Plans Post-Graduation / Placements)</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>

              {/* Safe Transfer Mapping Card */}
              <div style={{
                marginTop: 18,
                padding: '12px 16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldAlert size={14} color="#2563eb" />
                  <span>Real-Time Safe Transfer Mapping (Zero Target Leakage)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, fontSize: 12 }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Scaled G1:</span>{' '}
                    <strong style={{ color: liveScaledG1 < 10 ? '#dc2626' : '#059669' }}>{liveScaledG1} / 20</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Mapped Absences:</span>{' '}
                    <strong>{liveAbsences} classes</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Study Tier:</span>{' '}
                    <strong>{collegeFormData.study_hours_per_week < 2 ? 'Tier 1 (<2h)' : collegeFormData.study_hours_per_week < 5 ? 'Tier 2 (2-5h)' : collegeFormData.study_hours_per_week < 10 ? 'Tier 3 (5-10h)' : 'Tier 4 (>10h)'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Leakage Status:</span>{' '}
                    <span className="badge badge-pass" style={{ fontSize: 10 }}>SAFE (No G3 used)</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <Sparkles size={16} />
                  {loading ? 'Running ML Inference...' : 'Run Performance Prediction'}
                </button>
              </div>
            </form>
          )}

          {error && (
            <div style={{
              marginTop: 16,
              padding: 12,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              color: '#dc2626',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ======================= RESULTS & EXPLANATIONS SECTION ======================= */}
        <div>
          {predictionResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Primary Prediction KPI Card */}
              <div
                className="card"
                style={{
                  borderLeft: `6px solid ${
                    predictionResult.predicted_at_risk === 1 || predictionResult.risk_tier === 'High Risk'
                      ? '#dc2626'
                      : predictionResult.risk_tier === 'Moderate Risk'
                      ? '#d97706'
                      : '#059669'
                  }`
                }}
              >
                <div className="card-header">
                  <div>
                    <div className="card-title">
                      <Award size={18} color="#2563eb" />
                      Prediction Diagnostic Outcome
                    </div>
                    <div className="card-subtitle">
                      Student: <strong>{predictionResult.student_id || formData.student_identifier}</strong>
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      predictionResult.predicted_at_risk === 1 || predictionResult.risk_tier === 'High Risk'
                        ? 'badge-risk'
                        : predictionResult.risk_tier === 'Moderate Risk'
                        ? 'badge-moderate'
                        : 'badge-pass'
                    }`}
                    style={{ fontSize: 13, padding: '6px 12px' }}
                  >
                    {predictionResult.risk_tier || predictionResult.predicted_outcome}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14, marginTop: 10 }}>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Risk Probability</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: predictionResult.risk_probability > 0.5 ? '#dc2626' : '#059669' }}>
                      {(predictionResult.risk_probability * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Confidence: {predictionResult.confidence_percentage}%</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Predicted Final Grade</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
                      {predictionResult.predicted_grade} <span style={{ fontSize: 14, color: '#64748b' }}>/ 20</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>
                      Scaled: {((predictionResult.predicted_grade / 20.0) * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Target Classification</div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: predictionResult.predicted_at_risk === 1 ? '#dc2626' : '#059669' }}>
                      {predictionResult.predicted_outcome || (predictionResult.predicted_at_risk === 1 ? 'At-Risk (Retain)' : 'Passing')}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      Model: Random Forest
                    </div>
                  </div>
                </div>
              </div>

              {/* SHAP Contributing Factors Card */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">
                      <TrendingUp size={16} color="#2563eb" />
                      SHAP Explainability (Contributing Factors)
                    </div>
                    <div className="card-subtitle">
                      Local feature contributions pushing risk higher (red) or lower (green)
                    </div>
                  </div>
                </div>

                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={shapData}
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val, name, item) => [
                          `${val > 0 ? '+' : ''}${val} (${item.payload.direction})`,
                          'SHAP Impact'
                        ]}
                      />
                      <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                        {shapData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.impact > 0 ? '#dc2626' : '#059669'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Actionable Recommendations */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">
                      <UserCheck size={16} color="#059669" />
                      Actionable Academic Recommendations
                    </div>
                    <div className="card-subtitle">
                      Prescriptive interventions tailored to student risk drivers
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {predictionResult.supportive_recommendations?.map((rec, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: 12,
                        background: '#f8fafc',
                        borderLeft: `4px solid ${
                          rec.priority === 'High' ? '#dc2626' : rec.priority === 'Medium' ? '#d97706' : '#059669'
                        }`,
                        borderRadius: 6
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{rec.category || rec.action_title}</span>
                        <span className={`badge ${rec.priority === 'High' ? 'badge-risk' : rec.priority === 'Medium' ? 'badge-moderate' : 'badge-pass'}`}>
                          {rec.priority} Priority
                        </span>
                      </div>
                      <p style={{ fontSize: 12.5, color: '#475569', marginTop: 4, lineHeight: 1.4 }}>
                        {rec.recommendation || rec.description}
                      </p>
                    </div>
                  ))}
                  {(!predictionResult.supportive_recommendations || predictionResult.supportive_recommendations.length === 0) && (
                    <p style={{ fontSize: 13, color: '#64748b' }}>No specific intervention recommendations triggered.</p>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="card state-container" style={{ padding: '60px 20px', minHeight: 400 }}>
              <Sparkles size={40} color="#94a3b8" />
              <h3 style={{ marginTop: 16 }}>Ready for Academic Performance Prediction</h3>
              <p style={{ maxWidth: 360, margin: '8px auto 0', color: '#64748b' }}>
                Fill in the student details or pick a preset profile on the left and click <strong>"Run Performance Prediction"</strong> to execute the machine learning pipeline.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
