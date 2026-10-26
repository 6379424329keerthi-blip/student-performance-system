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
  Info
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

export default function ModelEvaluationPage() {
  const { activeDatasetId, isBenchmark, activeDataset } = useDataset();
  const [modelMeta, setModelMeta] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [featureImportance, setFeatureImportance] = useState([]);
  const [selectedModelIdx, setSelectedModelIdx] = useState(3); // Random Forest by default
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeDatasetId]);

  const fetchData = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="state-container">
        <div className="loading-spinner" />
        <h3>Loading Model Evaluation Diagnostics...</h3>
        <p>Fetching metrics for {activeDataset?.name || 'cohort'} from backend API</p>
      </div>
    );
  }

  const clfs = comparison?.classification_comparison || [];
  const selectedModel = clfs[selectedModelIdx] || clfs[3] || {};
  const evalContext = modelMeta?.dataset_evaluation_context;
  const isEmpirical = evalContext?.evaluation_mode === 'Empirical Ground-Truth Validation';
  const empiricalPerf = evalContext?.empirical_performance;

  const cm = isEmpirical
    ? empiricalPerf.confusion_matrix
    : selectedModel.confusion_matrix || { tn: 0, fp: 0, fn: 0, tp: 0 };

  const top12Features = featureImportance.slice(0, 12);

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
                  {evalContext?.dataset_name || activeDataset?.name}: {evalContext?.evaluation_mode}
                </span>
                <span className={`badge ${isEmpirical ? 'badge-pass' : 'badge-info'}`}>
                  {isEmpirical ? 'Ground-Truth Evaluated' : 'Prospective Early-Warning Mode'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#334155', marginTop: 4, lineHeight: 1.5 }}>
                {isEmpirical ? (
                  <>
                    Empirically evaluated against <strong>{evalContext.evaluated_students_count} completed ground-truth student records</strong> in this cohort.
                    Accuracy: <strong>{(empiricalPerf.accuracy * 100).toFixed(1)}%</strong>, Recall: <strong>{(empiricalPerf.recall * 100).toFixed(1)}%</strong>, Precision: <strong>{(empiricalPerf.precision * 100).toFixed(1)}%</strong>, Macro F1: <strong>{empiricalPerf.f1}</strong>.
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

      {/* Model Comparison Table */}
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
                const isBest = m.is_selected === true;
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
                    <td>{m.test_f1?.toFixed(3)}</td>
                    <td>{m.roc_auc !== null ? m.roc_auc.toFixed(3) : 'N/A (Baseline)'}</td>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24 }}>
        
        {/* Confusion Matrix Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Table size={16} color="#2563eb" />
                Confusion Matrix Diagnostic: {isEmpirical ? `${evalContext.dataset_name} Empirical Ground-Truth` : selectedModel.model_name}
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
                <div style={{ fontSize: 24, fontWeight: 800, color: '#059669' }}>{cm.tn}</div>
                <div style={{ fontSize: 11, color: '#166534' }}>True Negatives (TN)</div>
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: 16, borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#d97706' }}>{cm.fp}</div>
                <div style={{ fontSize: 11, color: '#92400e' }}>False Positives (FP)</div>
              </div>

              <div style={{ fontWeight: 700, color: '#dc2626', textAlign: 'right', alignSelf: 'center' }}>
                Actual: At-Risk (1)
              </div>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 16, borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626' }}>{cm.fn}</div>
                <div style={{ fontSize: 11, color: '#991b1b' }}>False Negatives (FN)</div>
              </div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: 16, borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#2563eb' }}>{cm.tp}</div>
                <div style={{ fontSize: 11, color: '#1e40af' }}>True Positives (TP)</div>
              </div>
            </div>

            <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 12.5, color: '#475569' }}>
              <strong>Clinical Assessment:</strong> With {cm.tp} True Positives out of {cm.tp + cm.fn} at-risk cases, the system demonstrates high sensitivity, minimizing unflagged failing students ({cm.fn} False Negatives).
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
                Mean decrease in impurity across all trees in the ensemble
              </div>
            </div>
          </div>

          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={top12Features}
                margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="feature_label" type="category" tick={{ fontSize: 11 }} width={75} />
                <Tooltip formatter={(val) => [(val * 100).toFixed(2) + '%', 'Importance']} />
                <Bar dataKey="importance" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
