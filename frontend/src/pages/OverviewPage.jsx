import React, { useState, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  AlertTriangle,
  Award,
  Layers,
  ArrowRight,
  Sparkles,
  BookOpen,
  TrendingUp,
  CheckCircle2,
  Clock,
  Database
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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../services/api';
import { useDataset } from '../context/DatasetContext';

const RISK_COLORS = ['#dc2626', '#d97706', '#059669'];

export default function OverviewPage({ onNavigateToPredict, onSelectPredictionDetail }) {
  const { activeDatasetId, isBenchmark, activeDataset } = useDataset();
  const [overview, setOverview] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [activeDatasetId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovData, perfData, rData] = await Promise.all([
        api.getOverview(activeDatasetId),
        api.getPerformanceAnalytics(activeDatasetId),
        api.getRiskAnalytics(activeDatasetId)
      ]);
      setOverview(ovData);
      setPerformance(perfData);
      setRiskData(rData);
    } catch (e) {
      setError(e.message || 'Failed to load dashboard overview data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="state-container">
        <div className="loading-spinner" />
        <h3>Loading Academic Overview...</h3>
        <p>Fetching verified learning metrics for {activeDataset?.name || 'selected dataset'} from backend API</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-container">
        <AlertTriangle size={36} color="#dc2626" />
        <h3>Error Connecting to Analytics Backend</h3>
        <p>{error}</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={fetchData}>
          Retry Connection
        </button>
      </div>
    );
  }

  const kpis = overview?.kpi_cards || {};
  const tierPieData = riskData?.multi_tier_distribution?.map((t) => ({
    name: t.tier,
    value: t.count,
    percentage: t.percentage
  })) || [];

  return (
    <div>
      {/* Active Dataset Context Banner */}
      <div className="card" style={{ marginBottom: 20, padding: '12px 18px', background: isBenchmark ? '#f8fafc' : '#f0fdf4', borderLeft: `5px solid ${isBenchmark ? '#2563eb' : '#059669'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={18} color={isBenchmark ? '#2563eb' : '#059669'} />
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                Active Dataset: {overview?.dataset_name || activeDataset?.name}
              </span>
              <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>
                ({kpis.total_records?.toLocaleString() || 0} Total Records | {kpis.unique_students?.toLocaleString() || 0} Unique Students)
              </span>
            </div>
          </div>
          <span className={`badge ${isBenchmark ? 'badge-info' : 'badge-pass'}`}>
            {isBenchmark ? 'Benchmark Standard' : 'Custom College Cohort'}
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card teal">
          <div className="kpi-top">
            <span className="kpi-label">Total Student Records</span>
            <div className="kpi-icon-wrap" style={{ background: '#f0fdfa', color: '#0d9488' }}>
              <Users size={18} />
            </div>
          </div>
          <div className="kpi-value">{kpis.total_records?.toLocaleString()}</div>
          <div className="kpi-subtext">
            <span>{kpis.unique_students} unique individual students</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Average Final Score</span>
            <div className="kpi-icon-wrap">
              <GraduationCap size={18} />
            </div>
          </div>
          <div className="kpi-value">{kpis.average_final_grade} <span style={{ fontSize: 16, color: '#64748b' }}>/ 20</span></div>
          <div className="kpi-subtext">
            <span>Mid-term Formative Benchmark: {kpis.average_midterm_grade} / 20</span>
          </div>
        </div>

        <div className="kpi-card crimson">
          <div className="kpi-top">
            <span className="kpi-label">Observed At-Risk Cohort (Historical)</span>
            <div className="kpi-icon-wrap" style={{ background: '#fef2f2', color: '#dc2626' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="kpi-value">{kpis.observed_at_risk_count ?? kpis.at_risk_count} <span style={{ fontSize: 16, color: '#dc2626' }}>({kpis.observed_at_risk_percentage ?? kpis.at_risk_percentage}%)</span></div>
          <div className="kpi-subtext">
            <span>{kpis.historical_outcome_metric || 'Historical ground truth (Mandates retention)'}</span>
          </div>
        </div>

        <div className="kpi-card emerald">
          <div className="kpi-top">
            <span className="kpi-label">Best Model Metric</span>
            <div className="kpi-icon-wrap" style={{ background: '#f0fdf4', color: '#059669' }}>
              <Award size={18} />
            </div>
          </div>
          <div className="kpi-value">{kpis.best_model_recall}% <span style={{ fontSize: 14, color: '#059669' }}>Recall</span></div>
          <div className="kpi-subtext">
            <span>{kpis.best_model_name} (F1: {kpis.best_model_f1})</span>
          </div>
        </div>

        <div className="kpi-card amber">
          <div className="kpi-top">
            <span className="kpi-label">Evaluated Models</span>
            <div className="kpi-icon-wrap" style={{ background: '#fffbeb', color: '#d97706' }}>
              <Layers size={18} />
            </div>
          </div>
          <div className="kpi-value">{kpis.models_evaluated_count} <span style={{ fontSize: 14, color: '#d97706' }}>Algorithms</span></div>
          <div className="kpi-subtext">
            <span>Dummy, LogReg, Tree, RF, GradBoost</span>
          </div>
        </div>
      </div>

      {/* Subject / Department Benchmarks & Risk Tier Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <BookOpen size={16} color="#2563eb" />
                {isBenchmark ? 'Curriculum Subject Benchmarks' : 'Departmental Academic Benchmarks'}
              </div>
              <div className="card-subtitle">
                {isBenchmark ? 'Performance breakdown by secondary subject' : `Breakdown by department for ${activeDataset?.name || 'Cohort'}`}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: performance?.subject_summary?.length > 1 ? '1fr 1fr' : '1fr', gap: 14 }}>
            {performance?.subject_summary?.map((sub) => (
              <div
                key={sub.course}
                style={{
                  background: sub.course === 'Math' ? '#eff6ff' : '#f0fdf4',
                  border: `1px solid ${sub.course === 'Math' ? '#bfdbfe' : '#bbf7d0'}`,
                  borderRadius: 10,
                  padding: 16
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{sub.course}</span>
                  <span className="badge badge-info">{sub.record_count} Records</span>
                </div>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 12, color: '#475569' }}>Average Final Grade: <strong style={{ color: '#0f172a' }}>{sub.avg_final_g3}/20</strong></div>
                  <div style={{ fontSize: 12, color: '#475569' }}>Mid-term Average: <strong style={{ color: '#0f172a' }}>{sub.avg_midterm_g1}/20</strong></div>
                  <div style={{ fontSize: 12, color: sub.at_risk_rate > 25 ? '#dc2626' : '#059669', fontWeight: 600, marginTop: 4 }}>
                    At-Risk Rate: {sub.at_risk_rate}%
                  </div>
                </div>
              </div>
            ))}
            {(!performance?.subject_summary || performance?.subject_summary.length === 0) && (
              <p style={{ color: '#64748b', fontSize: 13 }}>No department breakdown available.</p>
            )}
          </div>
        </div>

        {/* Multi-Tier Risk Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <AlertTriangle size={16} color="#d97706" />
                Observed Risk Tier Distribution
              </div>
              <div className="card-subtitle">Diagnostic breakdown based on historical outcomes (N = {kpis.total_records?.toLocaleString() || 0})</div>
            </div>
          </div>
          <div style={{ height: 210 }}>
            {tierPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tierPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                  >
                    {tierPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} students`, name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="state-container" style={{ padding: '40px 0' }}>
                <p>No risk tier distribution data available for this cohort.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progression Chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <div className="card-title">
              <TrendingUp size={16} color="#059669" />
              Formative Mid-term (G1) to Final Exam (G3) Academic Progression
            </div>
            <div className="card-subtitle">Correlation between early diagnostic evaluation (scaled 0-20) and end-of-term outcome</div>
          </div>
        </div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performance?.performance_progression || []} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="midterm_range" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val) => [`${val} / 20`, 'Avg Final Grade']} />
              <Bar dataKey="avg_final_grade" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Predictions Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Clock size={16} color="#475569" />
              Recent Student Evaluations & Predictions ({isBenchmark ? 'Global SQLite Registry' : `${activeDataset?.name || 'Cohort'} Predictions`})
            </div>
            <div className="card-subtitle">Live inference history executed through Random Forest pipeline</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={onNavigateToPredict}>
            <Sparkles size={14} />
            Run New Prediction
          </button>
        </div>

        {(!overview?.recent_predictions || overview.recent_predictions.length === 0) ? (
          <div className="state-container" style={{ padding: '24px 0' }}>
            <p>No student predictions generated for this dataset yet.</p>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={onNavigateToPredict}>
              Generate First Prediction
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Student Identifier</th>
                  <th>Course / Department</th>
                  <th>Predicted Outcome</th>
                  <th>Risk Probability</th>
                  <th>Expected Grade</th>
                  <th>Risk Tier</th>
                  <th>Evaluation Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {overview.recent_predictions.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td><strong>{p.student_identifier}</strong></td>
                    <td>{p.course}</td>
                    <td>
                      <span className={`badge ${p.predicted_at_risk === 1 ? 'badge-risk' : 'badge-pass'}`}>
                        {p.predicted_outcome}
                      </span>
                    </td>
                    <td>{(p.risk_probability * 100).toFixed(1)}%</td>
                    <td><strong>{p.predicted_grade} / 20</strong></td>
                    <td>
                      <span className={`badge ${p.risk_tier === 'High Risk' ? 'badge-risk' : p.risk_tier === 'Moderate Risk' ? 'badge-moderate' : 'badge-pass'}`}>
                        {p.risk_tier}
                      </span>
                    </td>
                    <td style={{ fontSize: 11.5, color: '#64748b' }}>{p.created_at}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onSelectPredictionDetail(p.id)}
                      >
                        Inspect SHAP
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
