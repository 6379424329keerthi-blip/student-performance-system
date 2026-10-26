import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Upload,
  Download,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Building,
  Eye,
  Edit2,
  Trash2,
  HelpCircle
} from 'lucide-react';
import api from '../services/api';
import AddEditStudentModal from '../components/AddEditStudentModal';
import ImportDatasetWizardModal from '../components/ImportDatasetWizardModal';
import CollegeStudentDetailModal from '../components/CollegeStudentDetailModal';

import { useDataset } from '../context/DatasetContext';

export default function StudentsPage({ onSelectStudentToPredict }) {
  // Global Dataset Context
  const {
    activeDatasetId,
    setActiveDatasetId,
    isBenchmark,
    datasets,
    refreshDatasets,
    activeDataset
  } = useDataset();

  // College Cohort State
  const [collegeRecords, setCollegeRecords] = useState([]);
  const [collegeLoading, setCollegeLoading] = useState(false);
  const [collegePage, setCollegePage] = useState(1);
  const [collegeTotalPages, setCollegeTotalPages] = useState(1);
  const [collegeTotalRecords, setCollegeTotalRecords] = useState(0);
  const [collegeSearch, setCollegeSearch] = useState('');
  const [collegeDeptFilter, setCollegeDeptFilter] = useState('');
  const [collegeRiskFilter, setCollegeRiskFilter] = useState('');

  // UCI Benchmark State
  const [benchRecords, setBenchRecords] = useState([]);
  const [benchLoading, setBenchLoading] = useState(false);
  const [benchPage, setBenchPage] = useState(1);
  const [benchTotalPages, setBenchTotalPages] = useState(1);
  const [benchTotalRecords, setBenchTotalRecords] = useState(0);
  const [benchCourseFilter, setBenchCourseFilter] = useState('');
  const [benchTierFilter, setBenchTierFilter] = useState('');
  const [benchSearch, setBenchSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [detailStudent, setDetailStudent] = useState(null);
  const [batchPredicting, setBatchPredicting] = useState(false);
  const [notification, setNotification] = useState(null);

  // Fetch College records when dataset or filters change
  useEffect(() => {
    if (!isBenchmark && activeDatasetId && activeDatasetId !== 'uci') {
      fetchCollegeStudents();
    }
  }, [activeDatasetId, isBenchmark, collegePage, collegeDeptFilter, collegeRiskFilter]);

  // Fetch Benchmark records when benchmark is active
  useEffect(() => {
    if (isBenchmark) {
      fetchBenchmarkStudents();
    }
  }, [isBenchmark, benchPage, benchCourseFilter, benchTierFilter]);

  const fetchCollegeStudents = async () => {
    setCollegeLoading(true);
    try {
      const data = await api.getCollegeStudents({
        dataset_id: Number(activeDatasetId),
        page: collegePage,
        limit: 12,
        search: collegeSearch || undefined,
        department: collegeDeptFilter || undefined,
        risk_filter: collegeRiskFilter || undefined
      });
      setCollegeRecords(data.records || []);
      setCollegeTotalPages(data.total_pages || 1);
      setCollegeTotalRecords(data.total_records || 0);
    } catch (e) {
      console.error('Failed to load college students:', e);
    } finally {
      setCollegeLoading(false);
    }
  };

  const fetchBenchmarkStudents = async () => {
    setBenchLoading(true);
    try {
      const data = await api.getDatasetRecords({
        page: benchPage,
        limit: 12,
        course: benchCourseFilter || undefined,
        risk_tier: benchTierFilter || undefined,
        search: benchSearch || undefined
      });
      setBenchRecords(data.records || []);
      setBenchTotalPages(data.total_pages || 1);
      setBenchTotalRecords(data.total_records || 0);
    } catch (e) {
      console.error('Failed to load benchmark students:', e);
    } finally {
      setBenchLoading(false);
    }
  };

  const handleCollegeSearchSubmit = (e) => {
    e.preventDefault();
    setCollegePage(1);
    fetchCollegeStudents();
  };

  const handleBenchSearchSubmit = (e) => {
    e.preventDefault();
    setBenchPage(1);
    fetchBenchmarkStudents();
  };

  // Actions
  const handleBatchPredict = async () => {
    setBatchPredicting(true);
    try {
      const res = await api.batchPredictCollegeStudents({ dataset_id: Number(activeDatasetId) });
      setNotification(`Evaluated ${res.total_predicted} students: ${res.high_risk_count} High Risk, ${res.moderate_risk_count} Moderate Risk, ${res.low_risk_count} Low Risk.`);
      fetchCollegeStudents();
    } catch (err) {
      alert(err.message || 'Batch prediction failed.');
    } finally {
      setBatchPredicting(false);
    }
  };

  const handleExportCollege = () => {
    window.open(api.getCollegeExportUrl(Number(activeDatasetId)), '_blank');
  };

  const handleDeleteCollegeStudent = async (pk, studentId) => {
    if (window.confirm(`Are you sure you want to delete student ${studentId}?`)) {
      try {
        await api.deleteCollegeStudent(pk);
        fetchCollegeStudents();
      } catch (err) {
        alert(err.message || 'Failed to delete student.');
      }
    }
  };

  return (
    <div>
      {/* Top Banner: Dataset Selector & Primary Action Buttons */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Dataset Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={18} color="#2563eb" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Active Dataset:</span>
            <select
              className="form-select"
              style={{ fontWeight: 600, minWidth: 260 }}
              value={activeDatasetId}
              onChange={(e) => {
                setActiveDatasetId(e.target.value);
                setCollegePage(1);
                setBenchPage(1);
              }}
            >
              {datasets.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name} ({d.student_count || d.records || 0} students)
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons (College Cohort Mode) */}
          {!isBenchmark && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setEditingStudent(null);
                  setShowAddModal(true);
                }}
              >
                <Plus size={15} /> Add Student
              </button>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowImportModal(true)}
              >
                <Upload size={15} /> Import Dataset
              </button>

              <a
                href={api.getCollegeTemplateUrl()}
                download="college_students_import_template.csv"
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={14} /> CSV Template
              </a>

              <button
                className="btn btn-secondary btn-sm"
                onClick={handleExportCollege}
                disabled={collegeTotalRecords === 0}
              >
                <Download size={14} /> Export Students
              </button>

              <button
                className="btn btn-primary btn-sm"
                style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
                onClick={handleBatchPredict}
                disabled={batchPredicting || collegeTotalRecords === 0}
              >
                <Sparkles size={14} />
                {batchPredicting ? 'Evaluating...' : 'Batch Predict ML'}
              </button>
            </div>
          )}
        </div>

        {/* Notification Alert */}
        {notification && (
          <div style={{
            marginTop: 14,
            padding: '10px 14px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 8,
            color: '#166534',
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{notification}</span>
            <button
              onClick={() => setNotification(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#166534' }}
            >
              ×
            </button>
          </div>
        )}

        {/* Filter Bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid #f1f5f9'
        }}>
          {!isBenchmark ? (
            // College Filters
            <>
              <form onSubmit={handleCollegeSearchSubmit} style={{ display: 'flex', gap: 8, flex: '1 1 300px' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: 36, width: '100%' }}
                    placeholder="Search by Roll No, Student Name, or Course..."
                    value={collegeSearch}
                    onChange={(e) => setCollegeSearch(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-sm">
                  Search
                </button>
              </form>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <select
                  className="form-select"
                  value={collegeDeptFilter}
                  onChange={(e) => {
                    setCollegeDeptFilter(e.target.value);
                    setCollegePage(1);
                  }}
                >
                  <option value="">All Departments</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Artificial Intelligence">Artificial Intelligence</option>
                  <option value="Electronics & Communication">Electronics & Comm</option>
                  <option value="Mechanical Engineering">Mechanical</option>
                  <option value="Electrical Engineering">Electrical</option>
                  <option value="Civil Engineering">Civil</option>
                </select>

                <select
                  className="form-select"
                  value={collegeRiskFilter}
                  onChange={(e) => {
                    setCollegeRiskFilter(e.target.value);
                    setCollegePage(1);
                  }}
                >
                  <option value="">All Risk Tiers</option>
                  <option value="High Risk">High Risk</option>
                  <option value="Moderate Risk">Moderate Risk</option>
                  <option value="Low Risk">Low Risk</option>
                  <option value="Not Scored">Not Scored</option>
                </select>
              </div>
            </>
          ) : (
            // UCI Benchmark Filters
            <>
              <form onSubmit={handleBenchSearchSubmit} style={{ display: 'flex', gap: 8, flex: '1 1 300px' }}>
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
                <button type="submit" className="btn btn-primary btn-sm">
                  Search
                </button>
              </form>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <select
                  className="form-select"
                  value={benchCourseFilter}
                  onChange={(e) => {
                    setBenchCourseFilter(e.target.value);
                    setBenchPage(1);
                  }}
                >
                  <option value="">All Courses</option>
                  <option value="Math">Mathematics</option>
                  <option value="Portuguese">Portuguese Language</option>
                </select>

                <select
                  className="form-select"
                  value={benchTierFilter}
                  onChange={(e) => {
                    setBenchTierFilter(e.target.value);
                    setBenchPage(1);
                  }}
                >
                  <option value="">All Risk Tiers</option>
                  <option value="High Risk">High Risk (&lt;10)</option>
                  <option value="Moderate Risk">Moderate Risk (10-13)</option>
                  <option value="Low Risk">Low Risk (14-20)</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
          <span>
            Showing {!isBenchmark ? collegeRecords.length : benchRecords.length} of {!isBenchmark ? collegeTotalRecords : benchTotalRecords} student profiles
          </span>
          <span>
            Page {!isBenchmark ? collegePage : benchPage} of {!isBenchmark ? collegeTotalPages : benchTotalPages}
          </span>
        </div>
      </div>

      {/* VIEW 1: COLLEGE STUDENTS GRID */}
      {!isBenchmark && (
        <>
          {collegeLoading ? (
            <div className="state-container">
              <div className="loading-spinner" />
              <h3>Loading College Students...</h3>
            </div>
          ) : collegeRecords.length === 0 ? (
            <div className="state-container card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <Users size={48} color="#94a3b8" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                No College Students Found in this Cohort
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', maxWidth: 460, margin: '0 auto 20px' }}>
                Get started by entering students one at a time, or upload an entire class list using a CSV or Excel spreadsheet.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setEditingStudent(null);
                    setShowAddModal(true);
                  }}
                >
                  <Plus size={16} /> + Add First Student
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowImportModal(true)}
                >
                  <Upload size={16} /> Import Dataset (CSV / Excel)
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 18, marginBottom: 24 }}>
              {collegeRecords.map((stu) => {
                const pred = stu.latest_prediction;
                const isHighRisk = pred ? pred.predicted_at_risk === 1 : stu.attendance_percentage < 75;
                const riskTier = pred ? pred.risk_tier : stu.attendance_percentage < 75 ? 'Attendance Warning' : 'Not Scored';

                return (
                  <div
                    key={stu.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderLeft: `4px solid ${
                        riskTier === 'High Risk' || riskTier === 'Attendance Warning'
                          ? '#dc2626'
                          : riskTier === 'Moderate Risk'
                          ? '#d97706'
                          : riskTier === 'Low Risk'
                          ? '#059669'
                          : '#cbd5e1'
                      }`
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{stu.student_name}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            {stu.student_id} • {stu.department}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            {stu.course_name} ({stu.semester})
                          </div>
                        </div>
                        <span className={`badge ${
                          riskTier === 'High Risk' || riskTier === 'Attendance Warning'
                            ? 'badge-risk'
                            : riskTier === 'Moderate Risk'
                            ? 'badge-moderate'
                            : riskTier === 'Low Risk'
                            ? 'badge-pass'
                            : 'badge-neutral'
                        }`}>
                          {riskTier}
                        </span>
                      </div>

                      {/* Marks Breakdown Box */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 8,
                        marginTop: 14,
                        background: '#f8fafc',
                        padding: 10,
                        borderRadius: 8,
                        fontSize: 12
                      }}>
                        <div>
                          <span style={{ color: '#64748b' }}>Internals:</span>{' '}
                          <strong>{stu.internal_marks} / {stu.max_internal_marks}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Prev Score:</span>{' '}
                          <strong>{stu.previous_score} / {stu.max_previous_score}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Attendance:</span>{' '}
                          <strong style={{ color: stu.attendance_percentage < 75 ? '#dc2626' : '#059669' }}>
                            {stu.attendance_percentage}%
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Scaled G1:</span>{' '}
                          <strong style={{ color: '#2563eb' }}>{stu.scaled_g1_score} / 20</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Study Hours:</span>{' '}
                          {stu.study_hours_per_week} hrs/wk
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Backlogs:</span>{' '}
                          <strong>{stu.failures}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div style={{
                      marginTop: 16,
                      paddingTop: 12,
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px' }}
                          title="Edit Student"
                          onClick={() => {
                            setEditingStudent(stu);
                            setShowAddModal(true);
                          }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', color: '#dc2626' }}
                          title="Delete Student"
                          onClick={() => handleDeleteCollegeStudent(stu.id, stu.student_id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setDetailStudent(stu)}
                      >
                        <Sparkles size={13} />
                        {pred ? 'View / Predict' : 'Run Prediction'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* College Pagination */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={collegePage <= 1}
              onClick={() => setCollegePage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              Page {collegePage} of {collegeTotalPages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={collegePage >= collegeTotalPages}
              onClick={() => setCollegePage((p) => Math.min(collegeTotalPages, p + 1))}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}

      {/* VIEW 2: UCI BENCHMARK GRID (Preserved exactly as existing) */}
      {isBenchmark && (
        <>
          {benchLoading ? (
            <div className="state-container">
              <div className="loading-spinner" />
              <h3>Loading UCI Benchmark Records...</h3>
            </div>
          ) : benchRecords.length === 0 ? (
            <div className="state-container card">
              <Users size={36} color="#64748b" />
              <h3>No Benchmark Records Match Filters</h3>
              <p>Try resetting the search terms or course filters.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18, marginBottom: 24 }}>
              {benchRecords.map((stu) => {
                const isHighRisk = stu.at_risk === 1;
                return (
                  <div
                    key={`${stu.student_id}-${stu.course}`}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderLeft: `4px solid ${isHighRisk ? '#dc2626' : stu.risk_tier === 'Moderate Risk' ? '#d97706' : '#059669'}`
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{stu.student_id}</span>
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            {stu.course} • School: {stu.school} • Age: {stu.age} ({stu.sex})
                          </div>
                        </div>
                        <span className={`badge ${isHighRisk ? 'badge-risk' : stu.risk_tier === 'Moderate Risk' ? 'badge-moderate' : 'badge-pass'}`}>
                          {stu.risk_tier}
                        </span>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 8,
                        marginTop: 14,
                        background: '#f8fafc',
                        padding: 10,
                        borderRadius: 8,
                        fontSize: 12
                      }}>
                        <div>
                          <span style={{ color: '#64748b' }}>Mid-term G1:</span> <strong>{stu.G1} / 20</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Actual G3:</span> <strong>{stu.G3} / 20</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Study Time:</span>{' '}
                          {stu.studytime === 1 ? '<2 hrs' : stu.studytime === 2 ? '2-5 hrs' : stu.studytime === 3 ? '5-10 hrs' : '>10 hrs'}
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Prior Failures:</span> <strong>{stu.failures}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Absences:</span> {stu.absences} days
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>School Support:</span> {stu.schoolsup}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onSelectStudentToPredict(stu)}
                      >
                        <Sparkles size={13} />
                        Predict & Intervene
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Benchmark Pagination */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={benchPage <= 1}
              onClick={() => setBenchPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              Page {benchPage} of {benchTotalPages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={benchPage >= benchTotalPages}
              onClick={() => setBenchPage((p) => Math.min(benchTotalPages, p + 1))}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}

      {/* Modals */}
      <AddEditStudentModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingStudent(null);
        }}
        onSuccess={() => {
          fetchCollegeStudents();
          refreshDatasets();
        }}
        datasetId={Number(activeDatasetId)}
        initialStudent={editingStudent}
      />

      <ImportDatasetWizardModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          fetchCollegeStudents();
          refreshDatasets();
        }}
        datasetId={Number(activeDatasetId)}
      />

      <CollegeStudentDetailModal
        isOpen={Boolean(detailStudent)}
        onClose={() => setDetailStudent(null)}
        student={detailStudent}
        onEdit={(stu) => {
          setEditingStudent(stu);
          setShowAddModal(true);
        }}
        onDeleted={() => {
          fetchCollegeStudents();
          refreshDatasets();
        }}
        onPredictionUpdated={(updated) => {
          setDetailStudent(updated);
          fetchCollegeStudents();
        }}
      />
    </div>
  );
}
