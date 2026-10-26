import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  Clock,
  CheckCircle2,
  Users,
  Database,
  GraduationCap,
  Sparkles
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
  LineChart,
  Line,
  Cell
} from 'recharts';
import api from '../services/api';
import { useDataset } from '../context/DatasetContext';

export default function AnalyticsPage() {
  const {
    activeDatasetId,
    setActiveDatasetId,
    isBenchmark,
    datasets: contextDatasets,
    activeDataset
  } = useDataset();

  const [activeTab, setActiveTab] = useState(isBenchmark ? 'benchmark' : 'college');

  // Benchmark Analytics State
  const [perfData, setPerfData] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [benchLoading, setBenchLoading] = useState(true);

  // College Analytics State
  const [collegeAnalytics, setCollegeAnalytics] = useState(null);
  const [collegeLoading, setCollegeLoading] = useState(false);

  // Sync tab with global dataset
  useEffect(() => {
    setActiveTab(isBenchmark ? 'benchmark' : 'college');
  }, [isBenchmark]);

  // Load benchmark analytics
  useEffect(() => {
    if (activeTab === 'benchmark') {
      fetchBenchmarkAnalytics();
    }
  }, [activeTab]);

  // Load college analytics when tab or activeDatasetId changes
  useEffect(() => {
    if (activeTab === 'college') {
      const targetId = !isBenchmark ? Number(activeDatasetId) : 1;
      fetchCollegeAnalytics(targetId);
    }
  }, [activeTab, activeDatasetId, isBenchmark]);

  const fetchBenchmarkAnalytics = async () => {
    setBenchLoading(true);
    try {
      const [pData, rData] = await Promise.all([
        api.getPerformanceAnalytics('uci'),
        api.getRiskAnalytics('uci')
      ]);
      setPerfData(pData);
      setRiskData(rData);
    } catch (e) {
      console.error('Benchmark analytics fetch error:', e);
    } finally {
      setBenchLoading(false);
    }
  };

  const fetchCollegeAnalytics = async (dsId) => {
    setCollegeLoading(true);
    try {
      const data = await api.getCollegeAnalyticsSummary(dsId);
      setCollegeAnalytics(data);
    } catch (e) {
      console.error('College analytics fetch error:', e);
    } finally {
      setCollegeLoading(false);
    }
  };

  const collegeDatasets = contextDatasets.filter((d) => d.id !== 'uci' && d.is_system_benchmark === 0);

  return (
    <div>
      {/* Top Source Switcher Bar */}
      <div className="card" style={{ marginBottom: 24, padding: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={20} color="#2563eb" />
            <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Analytics Scope:</span>
            <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 8 }}>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'benchmark' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 12px', fontSize: 12 }}
                onClick={() => {
                  setActiveTab('benchmark');
                  setActiveDatasetId('uci');
                }}
              >
                UCI Benchmark Analytics
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'college' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 12px', fontSize: 12 }}
                onClick={() => {
                  setActiveTab('college');
                  if (isBenchmark && collegeDatasets.length > 0) {
                    setActiveDatasetId(collegeDatasets[0].id);
                  }
                }}
              >
                My College Students Analytics
              </button>
            </div>
          </div>

          {activeTab === 'college' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Select Cohort:</span>
              <select
                className="form-select"
                style={{ fontSize: 13, fontWeight: 600 }}
                value={!isBenchmark ? activeDatasetId : (collegeDatasets[0]?.id || '1')}
                onChange={(e) => setActiveDatasetId(e.target.value)}
              >
                {collegeDatasets.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name} ({d.student_count || 0} students)
                  </option>
                ))}
                {collegeDatasets.length === 0 && (
                  <option value="1">No custom cohorts imported yet</option>
                )}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ==================== TAB 1: UCI BENCHMARK ANALYTICS ==================== */}
      {activeTab === 'benchmark' && (
        <>
          {benchLoading ? (
            <div className="state-container">
              <div className="loading-spinner" />
              <h3>Loading Academic Analytics...</h3>
            </div>
          ) : (
            <>
              {/* Top Overview Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginBottom: 24 }}>
                <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Study Time Effect</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                    28.2% vs. 11.8%
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Students studying &lt;2 hrs/week face more than double the failure risk of those studying 5-10 hrs/week.
                  </p>
                </div>

                <div className="card" style={{ borderLeft: '4px solid #dc2626' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Past Failures Impact</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
                    17.1% vs. 81.8%
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Prior retention is the single highest hazard factor; risk jumps from 17% (0 failures) to over 80% (3+ failures).
                  </p>
                </div>

                <div className="card" style={{ borderLeft: '4px solid #059669' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Curriculum Difference</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#059669', marginTop: 4 }}>
                    32.9% vs. 15.4%
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Mathematics exhibits substantially higher failure rates than Portuguese, reflecting cumulative prerequisite demands.
                  </p>
                </div>
              </div>

              {/* Row 1: Score Distributions & Study Time vs Risk */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 24, marginBottom: 24 }}>
                {/* Score Distribution */}
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">
                        <BarChart3 size={16} color="#2563eb" />
                        Mid-term (G1) vs. Final Exam (G3) Score Distributions
                      </div>
                      <div className="card-subtitle">Cohort frequency across statutory 0-20 score brackets</div>
                    </div>
                  </div>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={perfData?.score_distribution_bins || []} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="midterm_g1_count" name="Mid-term (G1)" fill="#0d9488" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="final_g3_count" name="Final Exam (G3)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Study Time vs Risk */}
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">
                        <Clock size={16} color="#0d9488" />
                        At-Risk Failure Rate by Weekly Study Volume
                      </div>
                      <div className="card-subtitle">Direct protective impact of self-study hours on failure reduction</div>
                    </div>
                  </div>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={riskData?.study_time_vs_risk || []} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="hours_label" tick={{ fontSize: 11 }} />
                        <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 40]} />
                        <Tooltip formatter={(v) => [`${v}%`, 'At-Risk Rate']} />
                        <Bar dataKey="at_risk_rate" name="At-Risk Rate (%)" fill="#0d9488" radius={[6, 6, 0, 0]}>
                          {riskData?.study_time_vs_risk?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#dc2626' : index === 1 ? '#d97706' : '#059669'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Row 2: Prior Failures & Absences */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 24 }}>
                {/* Failures vs Risk */}
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">
                        <AlertTriangle size={16} color="#dc2626" />
                        At-Risk Failure Rate by Prior Academic Retention
                      </div>
                      <div className="card-subtitle">Correlation with previous course repetition count</div>
                    </div>
                  </div>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={riskData?.prior_failures_vs_risk || []} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="failures" tick={{ fontSize: 11 }} />
                        <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 100]} />
                        <Tooltip formatter={(v, n, p) => [`${v}% (n=${p.payload.student_count})`, 'At-Risk Rate']} />
                        <Bar dataKey="at_risk_rate" name="At-Risk Rate (%)" fill="#dc2626" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Absences vs Risk */}
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">
                        <Users size={16} color="#475569" />
                        At-Risk Probability by School Absences Bracket
                      </div>
                      <div className="card-subtitle">Impact of cumulative missed classroom days</div>
                    </div>
                  </div>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={riskData?.absences_vs_risk || []} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="bracket" tick={{ fontSize: 11 }} />
                        <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 45]} />
                        <Tooltip formatter={(v, n, p) => [`${v}% (n=${p.payload.student_count})`, 'At-Risk Rate']} />
                        <Bar dataKey="at_risk_rate" name="At-Risk Rate (%)" fill="#475569" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ==================== TAB 2: COLLEGE ANALYTICS ==================== */}
      {activeTab === 'college' && (
        <>
          {collegeLoading ? (
            <div className="state-container">
              <div className="loading-spinner" />
              <h3>Calculating College Analytics from Database...</h3>
            </div>
          ) : !collegeAnalytics || collegeAnalytics.total_students === 0 ? (
            <div className="state-container card" style={{ padding: 48, textAlign: 'center' }}>
              <GraduationCap size={48} color="#94a3b8" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>No Students in this Cohort</h3>
              <p style={{ fontSize: 13, color: '#64748b', maxWidth: 440, margin: '8px auto 0' }}>
                Add students manually or import a spreadsheet from the Students page to see real dynamic analytics here.
              </p>
            </div>
          ) : (
            <>
              {/* College KPI Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Cohort Students</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                    {collegeAnalytics.total_students}
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    {collegeAnalytics.dataset_name}
                  </p>
                </div>

                <div className="card" style={{ borderLeft: `4px solid ${collegeAnalytics.avg_attendance < 75 ? '#dc2626' : '#059669'}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Avg Attendance Rate</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: collegeAnalytics.avg_attendance < 75 ? '#dc2626' : '#059669', marginTop: 4 }}>
                    {collegeAnalytics.avg_attendance}%
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Across all logged class sessions
                  </p>
                </div>

                <div className="card" style={{ borderLeft: '4px solid #0d9488' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Avg Scaled Score (G1)</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0d9488', marginTop: 4 }}>
                    {collegeAnalytics.avg_scaled_g1} / 20
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Internal: {collegeAnalytics.avg_internal_pct}% • Prev: {collegeAnalytics.avg_previous_pct}%
                  </p>
                </div>

                <div className="card" style={{ borderLeft: `4px solid ${collegeAnalytics.at_risk_percentage > 25 ? '#dc2626' : '#d97706'}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Students At-Risk</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
                    {collegeAnalytics.at_risk_count} ({collegeAnalytics.at_risk_percentage}%)
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    High Risk ML inference or low attendance
                  </p>
                </div>
              </div>

              {/* Row 1: College Score Distribution & Attendance Brackets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 24, marginBottom: 24 }}>
                {/* Score Distribution */}
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">
                        <BarChart3 size={16} color="#2563eb" />
                        Academic Performance Distribution (0-20 Scale)
                      </div>
                      <div className="card-subtitle">Composite score distribution scaled from institutional assessments</div>
                    </div>
                  </div>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={collegeAnalytics.score_distribution} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v, n, p) => [`${v} students (${p.payload.percentage}%)`, 'Count']} />
                        <Bar dataKey="count" name="Students" fill="#2563eb" radius={[6, 6, 0, 0]}>
                          {collegeAnalytics.score_distribution.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={idx === 0 ? '#dc2626' : idx === 1 ? '#d97706' : '#059669'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Attendance Brackets */}
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">
                        <Users size={16} color="#059669" />
                        Attendance Status Breakdown
                      </div>
                      <div className="card-subtitle">Critical (&lt;75%), Warning (75-85%), and Satisfactory (&gt;85%)</div>
                    </div>
                  </div>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={collegeAnalytics.attendance_brackets} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v, n, p) => [`${v} students (${p.payload.percentage}%)`, 'Students']} />
                        <Bar dataKey="count" name="Students" radius={[6, 6, 0, 0]}>
                          {collegeAnalytics.attendance_brackets.map((entry, idx) => (
                            <Cell key={`cell-att-${idx}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Row 2: Department Breakdown & Study Time Effect */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 24, marginBottom: 24 }}>
                {/* Department Performance */}
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">
                        <GraduationCap size={16} color="#7c3aed" />
                        Department / Branch Performance Comparison
                      </div>
                      <div className="card-subtitle">Average attendance rate and scaled G1 score by academic department</div>
                    </div>
                  </div>
                  <div style={{ height: 280 }}>
                    {collegeAnalytics.department_breakdown.length === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                        No department data available
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={collegeAnalytics.department_breakdown} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="avg_attendance" name="Avg Attendance %" fill="#059669" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="risk_rate_percentage" name="Risk Rate %" fill="#dc2626" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Study Time vs Scaled Score */}
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">
                        <Clock size={16} color="#0d9488" />
                        Study Volume vs Scaled Academic Performance
                      </div>
                      <div className="card-subtitle">Correlation between weekly self-study hours and average score</div>
                    </div>
                  </div>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={collegeAnalytics.study_time_breakdown} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="bracket" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} domain={[0, 20]} />
                        <Tooltip formatter={(v, n, p) => [`${v} / 20 (n=${p.payload.student_count})`, 'Avg Scaled G1']} />
                        <Bar dataKey="avg_scaled_g1" name="Avg Scaled G1 (0-20)" fill="#0d9488" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
