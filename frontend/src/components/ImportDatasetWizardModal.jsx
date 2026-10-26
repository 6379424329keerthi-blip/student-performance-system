import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Download,
  Settings,
  HelpCircle,
  Database,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import { useDataset } from '../context/DatasetContext';

const REQUIRED_APP_FIELDS = [
  { key: 'student_id', label: 'Student Roll / ID', required: true },
  { key: 'student_name', label: 'Student Full Name', required: true },
  { key: 'department', label: 'Department / Branch', required: true },
  { key: 'course_name', label: 'Course / Subject', required: true },
  { key: 'semester', label: 'Semester / Term', required: true },
  { key: 'attendance_percentage', label: 'Attendance Percentage (%)', required: true },
  { key: 'internal_marks', label: 'Internal Assessment Marks', required: true },
  { key: 'previous_score', label: 'Previous Academic Score', required: true },
  { key: 'assignment_marks', label: 'Assignment / Lab Marks', required: false },
  { key: 'study_hours_per_week', label: 'Study Hours / Week', required: false },
  { key: 'failures', label: 'Past Backlogs / Failures', required: false },
  { key: 'observed_final_score', label: 'Observed Final Score (Optional)', required: false }
];

export default function ImportDatasetWizardModal({
  isOpen,
  onClose,
  onSuccess,
  datasetId = 1
}) {
  const { refreshDatasets } = useDataset();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 2 State
  const [previewData, setPreviewData] = useState(null);

  // Step 3 State: Column Mapping & Assessment Config
  const [columnMapping, setColumnMapping] = useState({});
  const [assessmentConfig, setAssessmentConfig] = useState({
    max_internal_marks: 25.0,
    max_previous_score: 100.0,
    max_assignment_marks: 25.0
  });
  const [duplicatePolicy, setDuplicatePolicy] = useState('skip'); // 'skip', 'update', 'reject'

  // Step 4 State: Validation Results
  const [validationResult, setValidationResult] = useState(null);
  const [skipInvalid, setSkipInvalid] = useState(true);

  // Step 5 State: Final Import Result
  const [importResult, setImportResult] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg('');
    }
  };

  // Step 1 -> 2: Upload & Preview
  const handleProceedToPreview = async () => {
    if (!file) {
      setErrorMsg('Please select a CSV or Excel file.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.previewSpreadsheet(formData);
      setPreviewData(res);
      const mapping = res.suggested_mapping || {};
      setColumnMapping(mapping);

      // Auto-detect max scales from preview data if values > 25
      const intCol = mapping.internal_marks;
      if (intCol && res.preview_rows?.some((r) => Number(r[intCol]) > 25)) {
        setAssessmentConfig((prev) => ({ ...prev, max_internal_marks: 100.0 }));
      }
      const assignCol = mapping.assignment_marks;
      if (assignCol && res.preview_rows?.some((r) => Number(r[assignCol]) > 25)) {
        setAssessmentConfig((prev) => ({ ...prev, max_assignment_marks: 100.0 }));
      }

      setStep(2);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to parse file.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 -> 3: Move to mapping
  const handleProceedToMapping = () => {
    setStep(3);
  };

  // Step 3 -> 4: Validate all rows from file against mapping
  const handleValidateMapping = async () => {
    for (const req of REQUIRED_APP_FIELDS) {
      if (req.required && !columnMapping[req.key]) {
        setErrorMsg(`Please map a column for required field: "${req.label}".`);
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dataset_id', String(datasetId));
      formData.append('column_mapping', JSON.stringify(columnMapping));
      formData.append('assessment_config', JSON.stringify(assessmentConfig));
      formData.append('duplicate_policy', duplicatePolicy);

      const res = await api.validateDatasetFile(formData);
      setValidationResult(res);
      setStep(4);
    } catch (err) {
      setErrorMsg(err.message || 'Validation failed.');
    } finally {
      setLoading(false);
    }
  };

  // Step 4 -> 5: Commit Import
  const handleCommitImport = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dataset_id', String(datasetId));
      formData.append('column_mapping', JSON.stringify(columnMapping));
      formData.append('assessment_config', JSON.stringify(assessmentConfig));
      formData.append('skip_invalid', String(skipInvalid));
      formData.append('duplicate_policy', duplicatePolicy);

      const res = await api.importDatasetFile(formData);
      setImportResult(res);
      setStep(5);
      refreshDatasets();
    } catch (err) {
      setErrorMsg(err.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    refreshDatasets();
    onSuccess();
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 16
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: 820,
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Wizard Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 16,
          borderBottom: '1px solid #e2e8f0',
          marginBottom: 16
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileSpreadsheet size={20} color="#2563eb" />
              Import College Student Dataset
            </h2>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Step {step} of 5: {
                step === 1 ? 'Upload File' :
                step === 2 ? 'Spreadsheet Preview' :
                step === 3 ? 'Column Mapping & Assessment Scale' :
                step === 4 ? 'Data Validation' : 'Import Complete'
              }
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 4,
                backgroundColor: s <= step ? '#2563eb' : '#e2e8f0'
              }}
            />
          ))}
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

        {/* STEP 1: Upload File */}
        {step === 1 && (
          <div>
            <div style={{
              border: '2px dashed #cbd5e1',
              borderRadius: 12,
              padding: '36px 20px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              cursor: 'pointer'
            }}>
              <Upload size={40} color="#2563eb" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                Choose a CSV or Excel (.xlsx) file
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                Upload 500+ student records. All records will be validated and imported into your cohort database.
              </p>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                style={{ fontSize: 13, color: '#475569' }}
              />
              {file && (
                <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: '#059669' }}>
                  ✓ Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 20,
              padding: '12px 16px',
              background: '#f1f5f9',
              borderRadius: 8
            }}>
              <div style={{ fontSize: 12, color: '#475569' }}>
                Need a pre-formatted template with standard headers?
              </div>
              <a
                href={api.getCollegeTemplateUrl()}
                download="college_students_import_template.csv"
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={14} />
                Download CSV Template
              </a>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                className="btn btn-primary"
                disabled={!file || loading}
                onClick={handleProceedToPreview}
              >
                {loading ? 'Reading Spreadsheet...' : 'Next: Preview Data'}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Spreadsheet Preview */}
        {step === 2 && previewData && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#475569' }}>
                File: <strong>{previewData.filename}</strong> • Found <strong>{previewData.total_rows} total records</strong> and <strong>{previewData.detected_columns.length} columns</strong>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>Displaying first 10 rows for preview</span>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, maxHeight: 320 }}>
              <table className="data-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    {previewData.detected_columns.map((col) => (
                      <th key={col} style={{ whiteSpace: 'nowrap' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.preview_rows.map((row, idx) => (
                    <tr key={idx}>
                      {previewData.detected_columns.map((col) => (
                        <td key={col} style={{ whiteSpace: 'nowrap' }}>
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn btn-primary" onClick={handleProceedToMapping}>
                Next: Map Columns & Scale <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Column Mapping & Assessment Configuration */}
        {step === 3 && (
          <div>
            {/* Assessment Max Marks Configuration */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 14,
              marginBottom: 18
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                <Settings size={15} color="#2563eb" />
                Assessment Scale Configuration (Maximum Marks)
              </div>
              <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 12px 0' }}>
                Configure maximum marks used in your college records (e.g. 100, 50, 25). Scores will be validated against this scale without altering values.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Max Internal Marks</label>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                    {[25, 50, 100].map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        className={`btn btn-sm ${assessmentConfig.max_internal_marks === sc ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '2px 8px', fontSize: 10 }}
                        onClick={() => setAssessmentConfig({ ...assessmentConfig, max_internal_marks: sc })}
                      >
                        {sc} Marks
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    className="form-input"
                    value={assessmentConfig.max_internal_marks}
                    onChange={(e) => setAssessmentConfig({ ...assessmentConfig, max_internal_marks: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Max Previous Score</label>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                    {[100, 10].map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        className={`btn btn-sm ${assessmentConfig.max_previous_score === sc ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '2px 8px', fontSize: 10 }}
                        onClick={() => setAssessmentConfig({ ...assessmentConfig, max_previous_score: sc })}
                      >
                        {sc === 10 ? '10 (CGPA)' : '100 Marks'}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    className="form-input"
                    value={assessmentConfig.max_previous_score}
                    onChange={(e) => setAssessmentConfig({ ...assessmentConfig, max_previous_score: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Max Assignment Marks</label>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                    {[25, 50, 100].map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        className={`btn btn-sm ${assessmentConfig.max_assignment_marks === sc ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '2px 8px', fontSize: 10 }}
                        onClick={() => setAssessmentConfig({ ...assessmentConfig, max_assignment_marks: sc })}
                      >
                        {sc} Marks
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    className="form-input"
                    value={assessmentConfig.max_assignment_marks}
                    onChange={(e) => setAssessmentConfig({ ...assessmentConfig, max_assignment_marks: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Column Mapping Grid */}
            <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {REQUIRED_APP_FIELDS.map((f) => (
                  <div key={f.key} style={{ display: 'flex', flexDirection: 'column' }}>
                    <label className="form-label" style={{ fontSize: 12 }}>
                      {f.label} {f.required && <span style={{ color: '#dc2626' }}>*</span>}
                    </label>
                    <select
                      className="form-select"
                      style={{ fontSize: 12 }}
                      value={columnMapping[f.key] || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, [f.key]: e.target.value })}
                    >
                      <option value="">-- Do Not Map --</option>
                      {previewData.detected_columns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn btn-primary" disabled={loading} onClick={handleValidateMapping}>
                {loading ? 'Validating Full File...' : `Next: Validate All ${previewData.total_rows} Records`} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Validation Summary */}
        {step === 4 && validationResult && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
              <div className="card" style={{ padding: 12, background: '#f8fafc' }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Records Evaluated</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{validationResult.total_records}</div>
              </div>
              <div className="card" style={{ padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 11, color: '#166534', textTransform: 'uppercase', fontWeight: 600 }}>Valid Records</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d' }}>{validationResult.valid_records}</div>
              </div>
              <div className="card" style={{ padding: 12, background: validationResult.invalid_records > 0 ? '#fef2f2' : '#f8fafc', border: validationResult.invalid_records > 0 ? '1px solid #fecaca' : 'none' }}>
                <div style={{ fontSize: 11, color: validationResult.invalid_records > 0 ? '#991b1b' : '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Invalid / Duplicates</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: validationResult.invalid_records > 0 ? '#b91c1c' : '#64748b' }}>{validationResult.invalid_records}</div>
              </div>
            </div>

            {/* Duplicate Import Policy */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16
            }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>
                Duplicate Import Policy (when Student ID already exists in cohort):
              </label>
              <select
                className="form-select"
                value={duplicatePolicy}
                onChange={(e) => setDuplicatePolicy(e.target.value)}
                style={{ fontSize: 12, maxWidth: 440 }}
              >
                <option value="skip">Skip duplicates (Recommended — retain existing record)</option>
                <option value="update">Update existing records with new data from CSV</option>
                <option value="reject">Reject entire import if any duplicates exist</option>
              </select>
            </div>

            {validationResult.errors.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>
                  Validation Issues ({validationResult.errors.length} sample errors displayed):
                </div>
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #fecaca', borderRadius: 8, background: '#fff5f5' }}>
                  <table className="data-table" style={{ fontSize: 11 }}>
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Student ID</th>
                        <th>Field</th>
                        <th>Issue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationResult.errors.map((err, i) => (
                        <tr key={i}>
                          <td>{err.row_index}</td>
                          <td>{err.student_id || 'N/A'}</td>
                          <td><strong>{err.field}</strong></td>
                          <td style={{ color: '#b91c1c' }}>{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="skipInvalidCheckbox"
                    checked={skipInvalid}
                    onChange={(e) => setSkipInvalid(e.target.checked)}
                  />
                  <label htmlFor="skipInvalidCheckbox" style={{ fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                    Skip invalid rows and proceed with importing {validationResult.valid_records} valid records
                  </label>
                </div>
              </div>
            )}

            {validationResult.errors.length === 0 && (
              <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, color: '#166534', fontSize: 13, marginBottom: 16 }}>
                <CheckCircle2 size={20} />
                <span>All {validationResult.valid_records} student records passed validation checks cleanly!</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setStep(3)}>
                <ArrowLeft size={16} /> Back to Mapping
              </button>
              <button
                className="btn btn-primary"
                disabled={validationResult.valid_records === 0 || loading || (!skipInvalid && validationResult.invalid_records > 0)}
                onClick={handleCommitImport}
              >
                {loading ? 'Importing Full Dataset...' : `Confirm & Import ${skipInvalid ? validationResult.valid_records : validationResult.total_records} Records`}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Import Completion */}
        {step === 5 && importResult && (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              Dataset Import Successful!
            </h3>
            <p style={{ fontSize: 14, color: '#64748b', maxWidth: 440, margin: '0 auto 24px' }}>
              Successfully processed <strong>{importResult.total_processed} records</strong>.
              <br />
              <strong style={{ color: '#15803d' }}>{importResult.imported_count} records imported / updated</strong> in your database.
              {importResult.skipped_count > 0 && ` (${importResult.skipped_count} skipped or duplicate records).`}
            </p>

            <button className="btn btn-primary" onClick={handleFinish} style={{ margin: '0 auto' }}>
              View Cohort Students
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
