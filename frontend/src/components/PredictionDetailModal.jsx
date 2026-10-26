import React, { useState, useEffect } from 'react';
import { X, BrainCircuit, TrendingUp, TrendingDown, UserCheck, Clock } from 'lucide-react';
import api from '../services/api';

export default function PredictionDetailModal({ predictionId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (predictionId) {
      loadDetail();
    }
  }, [predictionId]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const data = await api.getPredictionDetail(predictionId);
      setDetail(data);
    } catch (e) {
      console.error('Failed to load prediction detail:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!predictionId) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: 26
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
              Prediction Inspection #{predictionId}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Student: {detail?.student_identifier} • Course: {detail?.course}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="state-container" style={{ padding: 40 }}>
            <div className="loading-spinner" />
            <p style={{ marginTop: 10 }}>Loading SHAP Diagnostics...</p>
          </div>
        ) : !detail ? (
          <div className="state-container">
            <p>Prediction record not found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Outcome Overview */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                background: detail.predicted_at_risk === 1 ? '#fef2f2' : '#f0fdf4',
                padding: 14,
                borderRadius: 10,
                border: `1px solid ${detail.predicted_at_risk === 1 ? '#fecaca' : '#bbf7d0'}`
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Predicted Status</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: detail.predicted_at_risk === 1 ? '#dc2626' : '#059669', marginTop: 2 }}>
                  {detail.predicted_outcome}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Risk Probability</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                  {(detail.risk_probability * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Expected Final G3</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                  {detail.predicted_grade} / 20
                </div>
              </div>
            </div>

            {/* SHAP Factors */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                Contributing Feature Drivers (SHAP Local Values):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {detail.contributing_factors?.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: '#f8fafc',
                      borderRadius: 8,
                      fontSize: 12.5
                    }}
                  >
                    <span>{f.feature_label} (Value: {f.value_display})</span>
                    <span style={{ fontWeight: 700, color: f.impact === 'Increases Risk' ? '#dc2626' : '#059669' }}>
                      {f.shap_value > 0 ? `+${f.shap_value}` : f.shap_value} ({f.impact})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                Recommended Pedagogical Interventions:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {detail.supportive_recommendations?.map((r, i) => (
                  <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: 12.5 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{r.title}</div>
                    <div style={{ color: '#475569' }}>{r.recommendation}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
