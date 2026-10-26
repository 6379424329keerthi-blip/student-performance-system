import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Server,
  Database,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Code,
  Sliders,
  Trash2,
  Lock,
  Plus
} from 'lucide-react';
import api from '../services/api';
import { useDataset } from '../context/DatasetContext';

export default function SettingsPage() {
  const {
    activeDatasetId,
    setActiveDatasetId,
    isBenchmark,
    datasets,
    refreshDatasets,
    activeDataset
  } = useDataset();

  const [health, setHealth] = useState(null);
  const [models, setModels] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState(null);

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    setLoading(true);
    try {
      const [hData, mData] = await Promise.all([
        api.getHealth(),
        api.getModels()
      ]);
      setHealth(hData);
      setModels(mData);
    } catch (e) {
      console.error('Settings load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCohort = async (ds) => {
    if (ds.id === 'uci' || ds.is_system_benchmark === 1) {
      alert('The UCI Student Performance Benchmark dataset is system-protected and cannot be deleted.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete dataset "${ds.name}" and all its student records? This action cannot be undone.`)) {
      try {
        await api.deleteDataset(ds.id);
        setActionMsg(`Dataset "${ds.name}" successfully deleted.`);
        if (activeDatasetId === String(ds.id)) {
          setActiveDatasetId('uci');
        }
        await refreshDatasets();
      } catch (err) {
        alert(err.message || 'Failed to delete dataset.');
      }
    }
  };

  return (
    <div>
      {/* Action Notification */}
      {actionMsg && (
        <div style={{
          marginBottom: 18,
          padding: 12,
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 8,
          color: '#166534',
          fontSize: 13,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{actionMsg}</span>
          <button
            onClick={() => setActionMsg(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#166534', fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}

      {/* SECTION 1: DATASET MANAGEMENT TABLE */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <div className="card-title">
              <Database size={16} color="#2563eb" />
              Dataset Cohort Registry & Active Selection
            </div>
            <div className="card-subtitle">
              Manage preloaded benchmark and imported institutional student cohorts
            </div>
          </div>
          <span className="badge badge-info">{datasets.length} Total Datasets</span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Dataset Name</th>
                <th>Scope / Department</th>
                <th>Academic Period</th>
                <th>Enrolled Records</th>
                <th>Type</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => {
                const isActive = String(d.id) === activeDatasetId;
                const isSys = d.id === 'uci' || d.is_system_benchmark === 1;
                return (
                  <tr key={d.id} style={{ background: isActive ? '#f0fdf4' : 'transparent' }}>
                    <td>
                      <strong>{d.name}</strong>
                      <div style={{ fontSize: 11.5, color: '#64748b' }}>{d.description}</div>
                    </td>
                    <td>{d.department || 'Curriculum System'}</td>
                    <td>{d.semester || 'All Terms'} {d.academic_year ? `(${d.academic_year})` : ''}</td>
                    <td>
                      <strong>{d.student_count ?? d.records ?? 0}</strong>
                    </td>
                    <td>
                      <span className={`badge ${isSys ? 'badge-info' : 'badge-pass'}`}>
                        {isSys ? 'Benchmark' : 'Custom Cohort'}
                      </span>
                    </td>
                    <td>
                      {isActive ? (
                        <span className="badge badge-pass" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={12} /> Active
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>Inactive</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {!isActive ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            onClick={() => setActiveDatasetId(String(d.id))}
                          >
                            Set Active
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>Selected</span>
                        )}

                        {isSys ? (
                          <span
                            title="UCI benchmark is protected from deletion"
                            style={{ color: '#94a3b8', display: 'inline-flex', alignItems: 'center', padding: '4px' }}
                          >
                            <Lock size={14} />
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 6px', color: '#dc2626' }}
                            title="Delete Cohort"
                            onClick={() => handleDeleteCohort(d)}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: ASSESSMENT SCALE CONFIGURATION */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <div className="card-title">
              <Sliders size={16} color="#059669" />
              Active Dataset Assessment Scale Configuration
            </div>
            <div className="card-subtitle">
              Configured evaluation scales for: <strong>{activeDataset?.name}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Continuous Internal Evaluation (CIE)</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
              Scale: 0 - {isBenchmark ? '20.0' : '100.0 (or 25.0)'}
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
              Normalized to 50% formative weight in scaled G1
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Previous Semester Score</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
              Scale: 0 - 100.0%
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
              Normalized to 35% baseline academic weight
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Assignment & Lab Marks</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
              Scale: 0 - {isBenchmark ? '20.0' : '100.0 (or 25.0)'}
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
              Normalized to 15% experiential evaluation weight
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Attendance & Risk Threshold</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
              &lt; 75.0% Attendance
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
              Scaled G1 &lt; 10 / 20 flags mandatory retention risk
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: SYSTEM HEALTH & DIAGNOSTICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20 }}>
        {/* Backend Status Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Server size={16} color="#2563eb" />
              FastAPI Backend Service Status
            </div>
            <button className="btn btn-secondary btn-sm" onClick={loadSettingsData}>
              <RefreshCw size={13} /> Check Health
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>API Status:</span>
              <span className={`badge ${health?.status === 'healthy' ? 'badge-pass' : 'badge-risk'}`}>
                {health?.status?.toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Service Name:</span>
              <strong>{health?.api_title || 'Smart Student Performance Prediction API'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Version:</span>
              <span>v{health?.version || '1.0.0'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Uptime:</span>
              <span>{health?.uptime_seconds} seconds</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ color: '#64748b' }}>Backend Server:</span>
              <code>Uvicorn (Python 3.12, FastAPI)</code>
            </div>
          </div>
        </div>

        {/* Database & Storage Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Database size={16} color="#059669" />
              Database & Model Registry
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Storage Engine:</span>
              <strong>SQLite 3 (Atomic Transactions & Foreign Keys)</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Active Database Tables:</span>
              <span><code>datasets</code>, <code>institution_students</code>, <code>institution_predictions</code>, <code>spreadsheet_imports</code></span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Active Classification Model:</span>
              <strong>{models?.selected_classifier?.name}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Active Grade Regressor:</span>
              <strong>{models?.selected_regressor?.name}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ color: '#64748b' }}>Explainability Engine:</span>
              <span>SHAP (TreeExplainer with Top Contributing Factors)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
