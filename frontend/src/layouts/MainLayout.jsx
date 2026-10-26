import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  BrainCircuit,
  BarChart3,
  Database,
  Award,
  FileText,
  Settings,
  GraduationCap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Upload
} from 'lucide-react';
import api from '../services/api';
import { useDataset } from '../context/DatasetContext';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'prediction', label: 'Performance Prediction', icon: BrainCircuit },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'dataset', label: 'Dataset Explorer', icon: Database },
  { id: 'evaluation', label: 'Model Evaluation', icon: Award },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function MainLayout({ activePage, setActivePage, children }) {
  const [systemHealth, setSystemHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const data = await api.getHealth();
      setSystemHealth(data);
    } catch (e) {
      setSystemHealth({ status: 'offline' });
    } finally {
      setLoadingHealth(false);
    }
  };

  const { activeDatasetId, setActiveDatasetId, datasets, isBenchmark, activeDataset } = useDataset();

  const currentPageObj = NAV_ITEMS.find((n) => n.id === activePage) || NAV_ITEMS[0];

  return (
    <div className="app-container">
      {/* Navy Blue Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-badge">
            <GraduationCap size={13} />
            Academic ML Analytics
          </div>
          <div className="brand-title">Smart Student Analytics</div>
          <div className="brand-subtitle">Performance Prediction System</div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActivePage(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status-pill">
            <span
              className={`status-dot ${
                systemHealth?.status === 'healthy' ? 'pulse' : ''
              }`}
              style={{
                backgroundColor:
                  systemHealth?.status === 'healthy'
                    ? '#10b981'
                    : systemHealth?.status === 'degraded'
                    ? '#f59e0b'
                    : '#ef4444',
              }}
            />
            <span>
              {systemHealth?.status === 'healthy'
                ? 'Backend API Active'
                : systemHealth?.status === 'degraded'
                ? 'System Degraded'
                : 'API Offline (Check :8000)'}
            </span>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7 }}>
            Scope: {isBenchmark ? 'UCI Benchmark (1,044)' : `${activeDataset?.name?.slice(0, 24)}...`}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        <header className="top-navbar">
          <div className="page-title-area">
            <h1>{currentPageObj.label}</h1>
            <p>Smart Student Performance Prediction & Risk Analytics</p>
          </div>

          <div className="top-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Global Active Dataset Selector */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#f8fafc',
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid #cbd5e1'
            }}>
              <Database size={15} color="#2563eb" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
                Active Dataset:
              </span>
              <select
                className="form-select"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '3px 8px',
                  height: 'auto',
                  minWidth: 240,
                  backgroundColor: '#ffffff'
                }}
                value={activeDatasetId}
                onChange={(e) => setActiveDatasetId(e.target.value)}
                title="Switch active dataset for all modules"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.is_system_benchmark === 1 ? '📊 ' : '🎓 '}
                    {d.name} ({d.student_count} records)
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setActivePage('dataset')}
              title="Manage and Import Datasets"
            >
              <Upload size={13} /> Import
            </button>
          </div>
        </header>

        <main className="content-body">{children}</main>
      </div>
    </div>
  );
}
