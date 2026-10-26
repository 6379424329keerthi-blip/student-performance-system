import React, { useState } from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  User,
  BookOpen,
  Calendar,
  Clock,
  Edit2,
  Trash2
} from 'lucide-react';
import api from '../services/api';

export default function CollegeStudentDetailModal({
  isOpen,
  onClose,
  student,
  onEdit,
  onDeleted,
  onPredictionUpdated
}) {
  const [predicting, setPredicting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeStudent, setActiveStudent] = useState(student);

  React.useEffect(() => {
    setActiveStudent(student);
  }, [student]);

  if (!isOpen || !activeStudent) return null;

  const latestPred = activeStudent.latest_prediction;

  const handleRunPredict = async () => {
    setPredicting(true);
    setErrorMsg('');
    try {
      const pred = await api.predictCollegeStudent(activeStudent.id);
      const updated = {
        ...activeStudent,
        latest_prediction: {
          prediction_id: pred.prediction_id,
          predicted_at_risk: pred.predicted_at_risk,
          predicted_outcome: pred.predicted_outcome,
          risk_probability: pred.risk_probability,
          predicted_grade: pred.predicted_grade,
          risk_tier: pred.risk_tier,
          confidence_percentage: pred.confidence_percentage,
          confidence_level: pred.confidence_level,
          shap_factors: pred.contributing_factors || [],
          recommendations: pred.supportive_recommendations || [],
          model_version: 'RandomForestClassifier-v1.0.0',
          created_at: pred.created_at
        }
      };
      setActiveStudent(updated);
      if (onPredictionUpdated) onPredictionUpdated(updated);
    } catch (err) {
      setErrorMsg(err.message || 'Prediction failed.');
    } finally {
      setPredicting(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete student ${activeStudent.student_id}?`)) {
      try {
        await api.deleteCollegeStudent(activeStudent.id);
        if (onDeleted) onDeleted(activeStudent.id);
        onClose();
      } catch (err) {
        setErrorMsg(err.message || 'Failed to delete student.');
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 16
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: 720,
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingBottom: 16,
          borderBottom: '1px solid #e2e8f0',
          marginBottom: 16
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {activeStudent.student_name}
              </h2>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>({activeStudent.student_id})</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              {activeStudent.department} • {activeStudent.course_name} • {activeStudent.semester}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Academic Marks & Profile Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 18 }}>
          <div className="card" style={{ padding: 12, background: '#f8fafc' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Internal Marks</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
              {activeStudent.internal_marks} / {activeStudent.max_internal_marks}
            </div>
          </div>
          <div className="card" style={{ padding: 12, background: '#f8fafc' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Previous Score</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
              {activeStudent.previous_score} / {activeStudent.max_previous_score}
            </div>
          </div>
          <div className="card" style={{ padding: 12, background: '#f8fafc' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Attendance</div>
            <div style={{
              fontSize: 16,
              fontWeight: 800,
              marginTop: 2,
              color: activeStudent.attendance_percentage < 75 ? '#dc2626' : '#059669'
            }}>
              {activeStudent.attendance_percentage}%
            </div>
          </div>
          <div className="card" style={{ padding: 12, background: '#f8fafc' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Scaled G1 Score</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#2563eb', marginTop: 2 }}>
              {activeStudent.scaled_g1_score} / 20
            </div>
          </div>
          <div className="card" style={{ padding: 12, background: '#f8fafc' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Study Hours</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
              {activeStudent.study_hours_per_week} hrs/wk
            </div>
          </div>
          <div className="card" style={{ padding: 12, background: '#f8fafc' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Past Backlogs</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: activeStudent.failures > 0 ? '#dc2626' : '#0f172a', marginTop: 2 }}>
              {activeStudent.failures}
            </div>
          </div>
        </div>

        {/* Machine Learning Prediction Status */}
        <div style={{
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 16,
          marginBottom: 18,
          background: latestPred ? '#ffffff' : '#f8fafc'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              <Sparkles size={16} color="#2563eb" />
              Machine Learning Prediction & Risk Assessment
            </div>
            <button
              className="btn btn-primary btn-sm"
              disabled={predicting}
              onClick={handleRunPredict}
            >
              <Sparkles size={13} />
              {predicting ? 'Evaluating Model...' : latestPred ? 'Re-run Prediction' : 'Run Prediction'}
            </button>
          </div>

          {latestPred ? (
            <div>
              {/* Prediction Outcome Banner */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 12,
                padding: 12,
                borderRadius: 8,
                background: latestPred.predicted_at_risk === 1 ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${latestPred.predicted_at_risk === 1 ? '#fecaca' : '#bbf7d0'}`,
                marginBottom: 14
              }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Predicted Outcome</div>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: latestPred.predicted_at_risk === 1 ? '#b91c1c' : '#15803d',
                    marginTop: 2
                  }}>
                    {latestPred.predicted_outcome}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Risk Tier</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                    {latestPred.risk_tier}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Risk Probability</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                    {(latestPred.risk_probability * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Predicted Grade</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#2563eb', marginTop: 2 }}>
                    {latestPred.predicted_grade} / 20
                  </div>
                </div>
              </div>

              {/* SHAP Factor Attributions */}
              {latestPred.shap_factors && latestPred.shap_factors.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                    Key Influencing Factors (SHAP Explanations):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {latestPred.shap_factors.map((f, i) => {
                      const isRisk = f.impact.includes('Increases Risk');
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: 12,
                            padding: '6px 10px',
                            background: '#f8fafc',
                            borderRadius: 6
                          }}
                        >
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{f.feature_label}</span>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: 600,
                            color: isRisk ? '#dc2626' : '#059669'
                          }}>
                            {isRisk ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                            {f.impact} ({f.shap_value > 0 ? `+${f.shap_value}` : f.shap_value})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Supportive Recommendations */}
              {latestPred.recommendations && latestPred.recommendations.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                    Actionable Interventions:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {latestPred.recommendations.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 6,
                          background: '#f8fafc',
                          borderLeft: `3px solid ${r.priority === 'High' ? '#dc2626' : '#2563eb'}`,
                          fontSize: 12
                        }}
                      >
                        <strong style={{ color: '#0f172a' }}>{r.title}: </strong>
                        <span style={{ color: '#475569' }}>{r.recommendation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 8px', color: '#64748b', fontSize: 13 }}>
              This student has not been scored yet. Click "Run Prediction" to evaluate risk with the Random Forest model.
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ color: '#dc2626', borderColor: '#fecaca' }}
            onClick={handleDelete}
          >
            <Trash2 size={14} /> Delete Student
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                onClose();
                if (onEdit) onEdit(activeStudent);
              }}
            >
              <Edit2 size={14} /> Edit Record
            </button>
            <button className="btn btn-primary btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
