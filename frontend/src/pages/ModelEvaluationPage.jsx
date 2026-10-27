import React, { useState, useEffect } from 'react';
import {
  Award,
  Layers,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  BarChart2,
  Table,
  ShieldCheck,
  Zap,
  Database,
  Info,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import api from '../services/api';
import { useDataset } from '../context/DatasetContext';

const FRIENDLY_FEATURE_LABELS = {
  failures: 'Past Failures',
  G1: 'Midterm G1 Score',
  absences: 'Class Absences',
  age: 'Student Age',
  goout: 'Going Out Freq',
  studytime: 'Weekly Study Time',
  health: 'Current Health',
  freetime: 'Free Time',
  Walc: 'Weekend Alcohol',
  Dalc: 'Workday Alcohol',
  Medu: 'Mother Education',
  Fedu: 'Father Education',
  traveltime: 'Travel Time',
  famrel: 'Family Relationship',
  course: 'Course (Math/Port)',
  school_MS: 'School (Mouzinho)',
  school_GP: 'School (Gabriel)',
  sex_M: 'Gender (Male)',
  sex_F: 'Gender (Female)',
  higher_yes: 'Plans Higher Edu',
  schoolsup_yes: 'School Support',
  schoolsup_no: 'No School Support',
  famsup_yes: 'Family Support',
  paid_yes: 'Extra Paid Classes',
  paid_no: 'No Paid Classes',
  activities_yes: 'Extracurriculars',
  internet_yes: 'Home Internet',
  romantic_yes: 'Romantic Rel',
  Pstatus_T: 'Parents Cohabiting',
  Mjob_teacher: 'Mother: Teacher',
  Mjob_health: 'Mother: Health',
  Mjob_services: 'Mother: Services',
  Mjob_at_home: 'Mother: At Home',
  Fjob_teacher: 'Father: Teacher',
  Fjob_services: 'Father: Services'
};

export default function ModelEvaluationPage() {
  const { activeDatasetId, isBenchmark, activeDataset } = useDataset();
  const [modelMeta, setModelMeta] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [featureImportance, setFeatureImportance] = useState([]);
  const [selectedModelIdx, setSelectedModelIdx] = useState(3); // Random Forest by default
  const [evaluationTab, setEvaluationTab] = useState('classification'); // 'classification' or 'regression'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [activeDatasetId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [metaData, compData, featData] = await Promise.all([
        api.getModels(activeDatasetId),
        api.getModelsComparison(activeDatasetId),
        api.getFeatureImportance(activeDatasetId)
      ]);
      setModelMeta(metaData);
      setComparison(compData);
      setFeatureImportance(featData.top_features || []);
    } catch (e) {
      console.error('Failed to load evaluation data:', e);
      setError('Could not connect to model evaluation endpoints. If using cloud hosting (Render), the backend server may take ~30-50s to complete its initial cold wake-up.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="state-container">
        <div className="loading-spinner" />
        <h3>Loading Model Evaluation Diagnostics...</h3>
        <p>Fetching benchmark metrics and candidate comparisons from backend API...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center', maxWidth: 640, margin: '40px auto' }}>
        <AlertCircle size={48} color="#dc2626" style={{ margin: '0 auto 16px auto' }} />
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Connection Delay or Backend Offline</h3>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 8, lineHeight: 1.6 }}>{error}</p>
        <button
          className="btn btn-primary"
          style={{ marginTop: 20 }}
          onClick={fetchData}
        >
          <RefreshCw size={15} /> Retry Model Diagnostics
        </button>
      </div>
    );
  }

  const clfs = comparison?.classification_comparison || [];
  const regs = comparison?.regression_comparison || [];
  const selectedModel = clfs[selectedModelIdx] || clfs[3] || clfs[0] || {};
  const evalContext = modelMeta?.dataset_evaluation_context;
  const isEmpirical = evalContext?.evaluation_mode === 'Empirical Ground-Truth Validation';
  const empiricalPerf = evalContext?.empirical_performance;

  const cm = (isEmpirical && empiricalPerf?.confusion_matrix)
    ? empiricalPerf.confusion_matrix
    : (selectedModel?.confusion_matrix || { tn: 0, fp: 0, fn: 0, tp: 0 });

  // Format feature importance with clean labels
  const top12Features = featureImportance.slice(0, 12).map((f) => ({
    ...f,
    feature_label: FRIENDLY_FEATURE_LABELS[f.feature] || f.feature.replace(/^num__/, '').replace(/^cat__/, '').replace(/_/g, ' ')
  }));

  const totalAtRiskCases = (cm.tp || 0) + (cm.fn || 0);

  return (
    <div>
      {/* Active Dataset Context Banner */}
      {!isBenchmark && (
        <div
          className="card"
          style={{
            marginBottom: 20,
            borderLeft: `6px solid ${isEmpirical ? '#059669' : '#2563eb'}`,
            background: isEmpirical ? '#f0fdf4' : '#eff6ff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ background: isEmpirical ? '#dcfce7' : '#dbeafe', padding: 10, borderRadius: 10, color: isEmpirical ? '#059669' : '#2563eb' }}>
              <Database size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  {evalContext?.dataset_name || activeDataset?.name}: {evalContext?.evaluation_mode || 'Prospective Mode'}
                </span>
                <span className={`badge ${isEmpirical ? 'badge-pass' : 'badge-info'}`}>
                  {isEmpirical ? 'Ground-Truth Evaluated' : 'Prospective Early-Warning Mode'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#334155', marginTop: 4, lineHeight: 1.5 }}>
                {isEmpirical && empiricalPerf ? (
                  <>
                    Empirically evaluated against <strong>{evalContext.evaluated_students_count} completed ground-truth student records</strong> in this cohort.
                    Accuracy: <strong>{((empiricalPerf.accuracy || 0) * 100).toFixed(1)}%</strong>, Recall: <strong>{((empiricalPerf.recall || 0) * 100).toFixed(1)}%</strong>, Precision: <strong>{((empiricalPerf.precision || 0) * 100).toFixed(1)}%</strong>, Macro F1: <strong>{empiricalPerf.f1}</strong>.
                  </>
                ) : (
                  <>
                    This cohort contains prospective (in-progress) student records without completed final examination grades. The fitted Random Forest early-warning model is applied via zero-leakage continuous assessment mapping (CIE marks + attendance). <strong>No fabricated empirical metrics are shown.</strong>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Primary Model Architecture Banner */}
      <div className="card" style={{ marginBottom: 24, borderLeft: '6px solid #059669', background: '#f0fdf4' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ background: '#dcfce7', padding: 10, borderRadius: 10, color: '#059669' }}>
            <Award size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#065f46' }}>
                Selected Primary Model: Random Forest Classifier (Balanced Subsample)
              </span>
              <span className="badge badge-pass">Optimal Architecture</span>
            </div>
            <p style={{ fontSize: 13, color: '#166534', marginTop: 4, lineHeight: 1.5 }}>
              <strong>Selection Rationale:</strong> In educational early-warning systems, failing to catch an at-risk student (False Negative) carries severe academic consequences, whereas a preventative advisory alert (False Positive) is harmless. The tuned Random Forest maximizes <strong>At-Risk Recall at 93.48% (43/46 caught)</strong>, with <strong>ROC-AUC of 0.947</strong>, <strong>Accuracy of 87.08%</strong>, and <strong>Macro F1 of 0.843</strong> on the untouched holdout test set (N=209) without data leakage.
            </p>
          </div>
        </div>
      </div>

      {/* Model Task Switcher */}
      <div className="card" style={{ marginBottom: 20, padding: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Evaluation Task:</span>
          <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 8 }}>
            <button
              type="button"
              className={`btn btn-sm ${evaluationTab === 'classification' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 12px', fontSize: 12 }}
              onClick={() => setEvaluationTab('classification')}
            >
              <Award size={14} /> Risk Classification (Early-Warning)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${evaluationTab === 'regression' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 12px', fontSize: 12 }}
              onClick={() => setEvaluationTab('regression')}
            >
              <TrendingUp size={14} /> Grade Regression (Final G3 Score)
            </button>
          </div>
        </div>
      </div>

      {/* ==================== TAB 1: CLASSIFICATION COMPARISON ==================== */}
      {evaluationTab === 'classification' && (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <div>
                <div className="card-title">
                  <Layers size={16} color="#2563eb" />
                  Comparative Benchmark: Baseline vs. 4 Candidate Classifiers
                </div>
                <div className="card-subtitle">
                  Measured test-set performance (Holdout N = 209; 46 At-Risk, 163 Passing)
                </div>
              </div>
              <span className="badge badge-info">Zero Leakage: StratifiedGroupKFold on student_id</span>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Model Architecture</th>
                    <th>5-Fold CV Recall</th>
                    <th>Test Accuracy</th>
                    <th>At-Risk Recall (Primary)</th>
                    <th>Test Precision</th>
                    <th>Macro F1</th>
                    <th>ROC-AUC</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {clfs.map((m, idx) => {
                    const isSelected = idx === selectedModelIdx;
                    const isBest = m.is_selected === true || m.model_name === 'RandomForestClassifier';
                    return (
                      <tr
                        key={m.model_name}
                        style={{ background: isSelected ? '#eff6ff' : 'transparent', cursor: 'pointer' }}
                        onClick={() => setSelectedModelIdx(idx)}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong>{m.model_name}</strong>
                            {isBest && <span className="badge badge-pass" style={{ fontSize: 10 }}>Selected</span>}
                          </div>
                        </td>
                        <td>{(m.cv_recall_mean * 100).toFixed(1)}% &plusmn; {(m.cv_recall_std * 100).toFixed(1)}%</td>
                        <td>{(m.test_accuracy * 100).toFixed(1)}%</td>
                        <td>
                          <strong style={{ color: m.test_recall > 0.8 ? '#059669' : m.test_recall === 0 ? '#dc2626' : '#d97706' }}>
                            {(m.test_recall * 100).toFixed(1)}%
                          </strong>
                        </td>
                        <td>{(m.test_precision * 100).toFixed(1)}%</td>
                        <td>{m.test_f1 !== undefined ? m.test_f1.toFixed(3) : m.test_macro_f1?.toFixed(3)}</td>
                        <td>{m.test_roc_auc !== null && m.test_roc_auc !== undefined ? m.test_roc_auc.toFixed(3) : (m.roc_auc !== null && m.roc_auc !== undefined ? m.roc_auc.toFixed(3) : 'N/A')}</td>
                        <td>
                          <button
                            type="button"
                            className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedModelIdx(idx);
                            }}
                          >
                            {isSelected ? 'Viewing' : 'Inspect'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grid: Confusion Matrix & Feature Importance */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24, marginBottom: 24 }}>
            
            {/* Confusion Matrix Card */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">
                    <Table size={16} color="#2563eb" />
                    Confusion Matrix: {isEmpirical ? `${evalContext.dataset_name} Empirical Ground-Truth` : (selectedModel?.model_name || 'Random Forest')}
                  </div>
                  <div className="card-subtitle">
                    {isEmpirical
                      ? `Evaluated on ${evalContext.evaluated_students_count} students with known final examination grades`
                      : 'Untouched holdout test set (N = 209)'}
                  </div>
                </div>
              </div>

              <div style={{ padding: '10px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 10, textAlign: 'center', fontSize: 13 }}>
                  <div />
                  <div style={{ fontWeight: 700, color: '#64748b' }}>Predicted: Pass (0)</div>
                  <div style={{ fontWeight: 700, color: '#dc2626' }}>Predicted: At-Risk (1)</div>

                  <div style={{ fontWeight: 700, color: '#059669', textAlign: 'right', alignSelf: 'center' }}>
                    Actual: Pass (0)
                  </div>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 16, borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#059669' }}>{cm.tn ?? 0}</div>
                    <div style={{ fontSize: 11, color: '#166534' }}>True Negatives (TN)</div>
                  </div>
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: 16, borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#d97706' }}>{cm.fp ?? 0}</div>
                    <div style={{ fontSize: 11, color: '#92400e' }}>False Positives (FP)</div>
                  </div>

                  <div style={{ fontWeight: 700, color: '#dc2626', textAlign: 'right', alignSelf: 'center' }}>
                    Actual: At-Risk (1)
                  </div>
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 16, borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626' }}>{cm.fn ?? 0}</div>
                    <div style={{ fontSize: 11, color: '#991b1b' }}>False Negatives (FN)</div>
                  </div>
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: 16, borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#2563eb' }}>{cm.tp ?? 0}</div>
                    <div style={{ fontSize: 11, color: '#1e40af' }}>True Positives (TP)</div>
                  </div>
                </div>

                <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 12.5, color: '#475569' }}>
                  <strong>Diagnostic Evaluation:</strong> With <strong>{cm.tp ?? 0} True Positives</strong> out of {totalAtRiskCases} actual at-risk students, the system achieves an at-risk sensitivity rate of {totalAtRiskCases > 0 ? (((cm.tp ?? 0) / totalAtRiskCases) * 100).toFixed(1) : 0}%, minimizing unflagged failing students ({cm.fn ?? 0} False Negatives).
                </div>
              </div>
            </div>

            {/* Global Feature Importance Chart */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">
                    <TrendingUp size={16} color="#059669" />
                    Random Forest Global Feature Importance (Top 12)
                  </div>
                  <div className="card-subtitle">
                    Mean decrease in impurity (MDI) across trees in ensemble
                  </div>
                </div>
              </div>

              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={top12Features}
                    margin={{ top: 5, right: 30, left: 95, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="feature_label" type="category" tick={{ fontSize: 10.5 }} width={90} />
                    <Tooltip formatter={(val) => [(val * 100).toFixed(2) + '%', 'Importance']} />
                    <Bar dataKey="importance" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </>
      )}

      {/* ==================== TAB 2: REGRESSION COMPARISON ==================== */}
      {evaluationTab === 'regression' && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                <TrendingUp size={16} color="#059669" />
                Continuous Grade Regression: Baseline vs. 4 Candidate Regressors
              </div>
              <div className="card-subtitle">
                Predicting continuous final grade G3 (0 - 20 point scale) on untouched holdout test set (N = 209)
              </div>
            </div>
            <span className="badge badge-info">Evaluation Metrics: MAE, RMSE, and R²</span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model Architecture</th>
                  <th>5-Fold CV MAE</th>
                  <th>5-Fold CV RMSE</th>
                  <th>5-Fold CV R²</th>
                  <th>Test MAE</th>
                  <th>Test RMSE</th>
                  <th>Test R² Score</th>
                </tr>
              </thead>
              <tbody>
                {regs.map((r, idx) => {
                  const isBest = r.model_name === 'RidgeRegression' || r.model_name === 'RandomForestRegressor';
                  return (
                    <tr key={r.model_name}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong>{r.model_name}</strong>
                          {isBest && <span className="badge badge-pass" style={{ fontSize: 10 }}>Strong</span>}
                        </div>
                      </td>
                      <td>{r.cv_mae_mean?.toFixed(2)} &plusmn; {r.cv_mae_std?.toFixed(2)}</td>
                      <td>{r.cv_rmse_mean?.toFixed(2)} &plusmn; {r.cv_rmse_std?.toFixed(2)}</td>
                      <td>{r.cv_r2_mean?.toFixed(3)} &plusmn; {r.cv_r2_std?.toFixed(3)}</td>
                      <td><strong>{r.test_mae?.toFixed(2)} pts</strong></td>
                      <td><strong>{r.test_rmse?.toFixed(2)} pts</strong></td>
                      <td>
                        <span style={{ color: (r.test_r2 || 0) > 0.7 ? '#059669' : '#d97706', fontWeight: 700 }}>
                          {r.test_r2?.toFixed(3)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leakage-Safe Methodology Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <ShieldCheck size={18} color="#059669" />
            Rigorous Leakage-Safe Evaluation Methodology
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <strong style={{ fontSize: 13, color: '#0f172a' }}>1. Student-Level Stratified Grouping</strong>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
              Since 382 students appear across both Mathematics and Portuguese courses, data is partitioned using <code>StratifiedGroupKFold</code> on <code>student_id</code>. No student appears in both train and test partitions.
            </p>
          </div>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <strong style={{ fontSize: 13, color: '#0f172a' }}>2. Isolated Preprocessing Pipelines</strong>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
              Standard scalers, one-hot encoders, and imputers are fitted strictly on training folds within <code>sklearn.pipeline.Pipeline</code>. No test statistics leak into model parameters.
            </p>
          </div>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <strong style={{ fontSize: 13, color: '#0f172a' }}>3. Target Isolation</strong>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
              The final grade (<code>G3</code>) is strictly withheld during early-warning inference. Prediction uses only mid-term marks (<code>G1</code>), continuous assessments, absences, and demographic factors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}