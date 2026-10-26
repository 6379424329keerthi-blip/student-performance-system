import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  Download,
  Filter,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Table,
  Upload,
  FileSpreadsheet,
  History,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useDataset } from '../context/DatasetContext';
import ImportDatasetWizardModal from '../components/ImportDatasetWizardModal';

export default function DatasetExplorerPage() {
  const {
    activeDatasetId,
    setActiveDatasetId,
    isBenchmark,
    datasets: contextDatasets,
    refreshDatasets,
    activeDataset
  } = useDataset();

  const [activeTab, setActiveTab] = useState(isBenchmark ? 'benchmark' : 'college');

  // Benchmark State
  const [summary, setSummary] = useState(null);
  const [benchRecords, setBenchRecords] = useState([]);
  const [benchPage, setBenchPage] = useState(1);
  const [benchLimit, setBenchLimit] = useState(15);
  const [benchTotalPages, setBenchTotalPages] = useState(1);
  const [benchTotalRecords, setBenchTotalRecords] = useState(0);
  const [courseFilter, setCourseFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [benchSearch, setBenchSearch] = useState('');
  const [benchLoading, setBenchLoading] = useState(true);

  // College State
  const [collegeRecords, setCollegeRecords] = useState([]);
  const [collegePage, setCollegePage] = useState(1);
  const [collegeTotalPages, setCollegeTotalPages] = useState(1);
  const [collegeTotalRecords, setCollegeTotalRecords] = useState(0);
  const [collegeSearch, setCollegeSearch] = useState('');
  const [collegeLoading, setCollegeLoading] = useState(false);
  const [collegeSummary, setCollegeSummary] = useState(null);
  const [importHistory, setImportHistory] = useState([]);
  const [collegeSubView, setCollegeSubView] = useState('records'); // 'records', 'stats', or 'history'
  const [showImportModal, setShowImportModal] = useState(false);

  const collegeDatasets = contextDatasets.filter((d) => d.id !== 'uci' && d.is_system_benchmark === 0);
  const selectedDatasetId = !isBenchmark ? activeDatasetId : (collegeDatasets[0]?.id || '1');

  // Sync active tab with global dataset
  useEffect(() => {
    setActiveTab(isBenchmark ? 'benchmark' : 'college');
  }, [isBenchmark]);

  useEffect(() => {
    if (activeTab === 'benchmark') {
      fetchBenchmarkSummary();
      fetchBenchmarkRecords();
    }
  }, [activeTab, benchPage, benchLimit, courseFilter, riskFilter]);

  useEffect(() => {
    if (activeTab === 'college' && selectedDatasetId) {
      fetchCollegeData();
    }
  }, [activeTab, selectedDatasetId, collegePage]);

  const fetchBenchmarkSummary = async () => {
    try {
      const data = await api.getDatasetSummary('uci');
      setSummary(data);
    } catch (e) {
      console.error('Failed to load dataset summary:', e);
    }
  };

  const fetchBenchmarkRecords = async () => {
    setBenchLoading(true);
    try {
      const data = await api.getDatasetRecords({
        dataset_id: 'uci',
        page: benchPage,
        limit: benchLimit,
        course: courseFilter || undefined,
        risk_tier: riskFilter || undefined,
        search: benchSearch || undefined
      });
      setBenchRecords(data.records || []);
      setBenchTotalPages(data.total_pages || 1);
      setBenchTotalRecords(data.total_records || 0);
    } catch (e) {
      console.error('Failed to load records:', e);
    } finally {
      setBenchLoading(false);
    }
  };

  const fetchCollegeData = async () => {
    setCollegeLoading(true);
    try {
      const dsId = Number(selectedDatasetId);
      const [stuRes, importRes, sumRes] = await Promise.all([
        api.getCollegeStudents({
          dataset_id: dsId,
          page: collegePage,
          limit: 15,
          search: collegeSearch || undefined
        }),
        fetch(`/api/college/datasets/${dsId}/imports`).then((r) => r.json()).catch(() => []),
        api.getDatasetSummary(String(dsId)).catch(() => null)
      ]);
      setCollegeRecords(stuRes.records || []);
      setCollegeTotalPages(stuRes.total_pages || 1);
      setCollegeTotalRecords(stuRes.total_records || 0);
      setImportHistory(importRes || []);
      setCollegeSummary(sumRes);
    } catch (e) {
      console.error('Failed to load college dataset data:', e);
    } finally {
      setCollegeLoading(false);
    }
  };

  const handleBenchSearch = (e) => {
    e.preventDefault();
    setBenchPage(1);
    fetchBenchmarkRecords();
  };

  const handleCollegeSearch = (e) => {
    e.preventDefault();
    setCollegePage(1);
    fetchCollegeData();
  };

  const activeCollegeDataset = datasets.find((d) => String(d.id) === selectedDatasetId);

  return (
    <div>
      {/* Top Dataset Type Selector */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={20} color="#2563eb" />
            <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Dataset Source:</span>
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
                UCI ML Benchmark (1,044 records)
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
                My College Datasets / Cohorts
              </button>
            </div>
          </div>

          {activeTab === 'college' && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select
                className="form-select"
                style={{ fontSize: 13, fontWeight: 600 }}
                value={selectedDatasetId}
                onChange={(e) => {
                  setActiveDatasetId(e.target.value);
                  setCollegePage(1);
                }}
              >
                {collegeDatasets.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name} ({d.student_count || 0} records)
                  </option>
                ))}
                {collegeDatasets.length === 0 && (
                  <option value="1">No custom cohorts imported</option>
                )}
              </select>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowImportModal(true)}
              >
                <Upload size={14} /> Import Spreadsheet
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ==================== TAB 1: UCI BENCHMARK ==================== */}
      {activeTab === 'benchmark' && (
        <>
          {/* Integrity & Summary Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Dataset Scale</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                {summary?.dimensions?.total_records?.toLocaleString() || '1,044'} Records
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>35 validated features • 662 unique students</div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#059669' }}>Data Completeness</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#059669', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={20} />
                100.0% Complete
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>0 missing values across all features</div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#2563eb' }}>Data License & Origin</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#2563eb', marginTop: 4 }}>
                UCI ML Repository
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>CC BY 4.0 Open License (Cortez & Silva, 2008)</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
              <form onSubmit={handleBenchSearch} style={{ display: 'flex', gap: 8, flex: '1 1 300px' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: 36, width: '100%' }}
                    placeholder="Search by Student ID (e.g. STU_0012) or School..."
                    value={benchSearch}
                    onChange={(e) => setBenchSearch(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-sm">Search</button>
              </form>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <select
                  className="form-select"
                  value={courseFilter}
                  onChange={(e) => { setCourseFilter(e.target.value); setBenchPage(1); }}
                >
                  <option value="">All Courses</option>
                  <option value="Math">Mathematics</option>
                  <option value="Portuguese">Portuguese Language</option>
                </select>

                <select
                  className="form-select"
                  value={riskFilter}
                  onChange={(e) => { setRiskFilter(e.target.value); setBenchPage(1); }}
                >
                  <option value="">All Risk Tiers</option>
                  <option value="High Risk">High Risk (&lt;10)</option>
                  <option value="Moderate Risk">Moderate Risk (10-13)</option>
                  <option value="Low Risk">Low Risk (14-20)</option>
                </select>

                <button className="btn btn-secondary btn-sm" onClick={() => window.open(api.getExportUrl('csv'), '_blank')}>
                  <Download size={15} /> Export Benchmark CSV
                </button>
              </div>
            </div>
          </div>

          {/* Benchmark Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
            {benchLoading ? (
              <div className="state-container">
                <div className="loading-spinner" />
                <h3>Loading Records...</h3>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Course</th>
                      <th>School</th>
                      <th>Sex / Age</th>
                      <th>Mid-Term G1</th>
                      <th>Actual G3</th>
                      <th>Risk Tier</th>
                      <th>Absences</th>
                      <th>Study Time</th>
                      <th>Support</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchRecords.map((r, i) => (
                      <tr key={i}>
                        <td><strong>{r.student_id}</strong></td>
                        <td>{r.course}</td>
                        <td>{r.school}</td>
                        <td>{r.sex}, {r.age}y</td>
                        <td><strong>{r.G1} / 20</strong></td>
                        <td><strong>{r.G3} / 20</strong></td>
                        <td>
                          <span className={`badge ${r.at_risk === 1 ? 'badge-risk' : r.risk_tier === 'Moderate Risk' ? 'badge-moderate' : 'badge-pass'}`}>
                            {r.risk_tier}
                          </span>
                        </td>
                        <td>{r.absences} days</td>
                        <td>{r.studytime === 1 ? '<2h' : r.studytime === 2 ? '2-5h' : r.studytime === 3 ? '5-10h' : '>10h'}</td>
                        <td>{r.schoolsup === 'yes' ? 'School' : 'None'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Benchmark Pagination */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-secondary btn-sm" disabled={benchPage <= 1} onClick={() => setBenchPage((p) => p - 1)}>
              <ChevronLeft size={16} /> Previous
            </button>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Page {benchPage} of {benchTotalPages}</span>
            <button className="btn btn-secondary btn-sm" disabled={benchPage >= benchTotalPages} onClick={() => setBenchPage((p) => p + 1)}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}

      {/* ==================== TAB 2: COLLEGE DATASETS ==================== */}
      {activeTab === 'college' && (
        <>
          {/* Metadata Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Cohort Name</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                {activeCollegeDataset?.name || 'College Cohort'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {activeCollegeDataset?.department} • {activeCollegeDataset?.semester}
              </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#2563eb' }}>Cohort Scale</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb', marginTop: 4 }}>
                {collegeTotalRecords} Students
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Stored in SQLite institution_students</div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#059669' }}>Import Log History</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#059669', marginTop: 4 }}>
                {importHistory.length} Imports Run
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Batch transaction verification active</div>
            </div>
          </div>

          {/* Sub-view switcher & Action bar */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${collegeSubView === 'records' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCollegeSubView('records')}
                >
                  <Table size={14} /> Student Records ({collegeTotalRecords})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${collegeSubView === 'history' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCollegeSubView('history')}
                >
                  <History size={14} /> Spreadsheet Import Logs ({importHistory.length})
                </button>
              </div>

              {collegeSubView === 'records' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <form onSubmit={handleCollegeSearch} style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search ID or name..."
                      value={collegeSearch}
                      onChange={(e) => setCollegeSearch(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary btn-sm">Search</button>
                  </form>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => window.open(api.getCollegeExportUrl(Number(selectedDatasetId)), '_blank')}
                    disabled={collegeTotalRecords === 0}
                  >
                    <Download size={14} /> Export CSV
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Subview 1: College Student Records */}
          {collegeSubView === 'records' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
              {collegeLoading ? (
                <div className="state-container">
                  <div className="loading-spinner" />
                  <h3>Loading College Records...</h3>
                </div>
              ) : collegeRecords.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
                  No student records found in this cohort. Click "Import Spreadsheet" above to add students.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Roll / ID</th>
                        <th>Student Name</th>
                        <th>Department</th>
                        <th>Course</th>
                        <th>Attendance</th>
                        <th>Internals</th>
                        <th>Prev Score</th>
                        <th>Scaled G1</th>
                        <th>Study Hours</th>
                        <th>ML Risk Tier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collegeRecords.map((r) => {
                        const pred = r.latest_prediction;
                        const riskTier = pred ? pred.risk_tier : 'Not Scored';
                        return (
                          <tr key={r.id}>
                            <td><strong>{r.student_id}</strong></td>
                            <td>{r.student_name}</td>
                            <td>{r.department}</td>
                            <td>{r.course_name}</td>
                            <td>
                              <span style={{ color: r.attendance_percentage < 75 ? '#dc2626' : '#059669', fontWeight: 600 }}>
                                {r.attendance_percentage}%
                              </span>
                            </td>
                            <td>{r.internal_marks} / {r.max_internal_marks}</td>
                            <td>{r.previous_score} / {r.max_previous_score}</td>
                            <td><strong style={{ color: '#2563eb' }}>{r.scaled_g1_score} / 20</strong></td>
                            <td>{r.study_hours_per_week}h</td>
                            <td>
                              <span className={`badge ${
                                riskTier === 'High Risk' ? 'badge-risk' :
                                riskTier === 'Moderate Risk' ? 'badge-moderate' :
                                riskTier === 'Low Risk' ? 'badge-pass' : 'badge-neutral'
                              }`}>
                                {riskTier}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Subview 2: Import History Log */}
          {collegeSubView === 'history' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
              {importHistory.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
                  No batch spreadsheet imports recorded yet for this dataset.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Import ID</th>
                        <th>File Name</th>
                        <th>Total Rows</th>
                        <th>Imported Rows</th>
                        <th>Skipped Rows</th>
                        <th>Timestamp</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importHistory.map((h) => (
                        <tr key={h.id}>
                          <td>#{h.id}</td>
                          <td><strong>{h.filename}</strong></td>
                          <td>{h.total_rows}</td>
                          <td style={{ color: '#15803d', fontWeight: 600 }}>{h.imported_rows}</td>
                          <td style={{ color: h.skipped_rows > 0 ? '#b91c1c' : '#64748b' }}>{h.skipped_rows}</td>
                          <td>{h.created_at}</td>
                          <td>
                            <span className="badge badge-pass">
                              Success ({h.imported_rows}/{h.total_rows})
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Pagination for College Records */}
          {collegeSubView === 'records' && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-secondary btn-sm" disabled={collegePage <= 1} onClick={() => setCollegePage((p) => p - 1)}>
                <ChevronLeft size={16} /> Previous
              </button>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Page {collegePage} of {collegeTotalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={collegePage >= collegeTotalPages} onClick={() => setCollegePage((p) => p + 1)}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Import Dataset Wizard Modal */}
      <ImportDatasetWizardModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          fetchCollegeData();
          refreshDatasets();
        }}
        datasetId={Number(selectedDatasetId)}
      />
    </div>
  );
}
