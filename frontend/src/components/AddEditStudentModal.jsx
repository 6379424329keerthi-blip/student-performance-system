import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Settings, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function AddEditStudentModal({
  isOpen,
  onClose,
  onSuccess,
  datasetId = 1,
  initialStudent = null
}) {
  const isEditing = Boolean(initialStudent);

  // Form State
  const [formData, setFormData] = useState({
    student_id: '',
    student_name: '',
    email: '',
    department: 'Computer Science',
    course_name: 'Data Structures & Algorithms',
    semester: 'Semester 5',
    academic_year: '2024-2025',
    attendance_percentage: 85.0,
    previous_score: 75.0,
    max_previous_score: 100.0,
    internal_marks: 18.0,
    max_internal_marks: 25.0,
    assignment_marks: 20.0,
    max_assignment_marks: 25.0,
    study_hours_per_week: 6.0,
    failures: 0,
    observed_final_score: ''
  });

  const [showConfig, setShowConfig] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialStudent) {
      setFormData({
        student_id: initialStudent.student_id || '',
        student_name: initialStudent.student_name || '',
        email: initialStudent.email || '',
        department: initialStudent.department || 'Computer Science',
        course_name: initialStudent.course_name || 'Core Curriculum',
        semester: initialStudent.semester || 'Semester 1',
        academic_year: initialStudent.academic_year || '2024-2025',
        attendance_percentage: initialStudent.attendance_percentage ?? 85.0,
        previous_score: initialStudent.previous_score ?? 75.0,
        max_previous_score: initialStudent.max_previous_score ?? 100.0,
        internal_marks: initialStudent.internal_marks ?? 18.0,
        max_internal_marks: initialStudent.max_internal_marks ?? 25.0,
        assignment_marks: initialStudent.assignment_marks ?? 20.0,
        max_assignment_marks: initialStudent.max_assignment_marks ?? 25.0,
        study_hours_per_week: initialStudent.study_hours_per_week ?? 6.0,
        failures: initialStudent.failures ?? 0,
        observed_final_score: initialStudent.observed_final_score !== null && initialStudent.observed_final_score !== undefined
          ? initialStudent.observed_final_score
          : ''
      });
    } else {
      setFormData({
        student_id: '',
        student_name: '',
        email: '',
        department: 'Computer Science',
        course_name: 'Data Structures & Algorithms',
        semester: 'Semester 5',
        academic_year: '2024-2025',
        attendance_percentage: 85.0,
        previous_score: 75.0,
        max_previous_score: 100.0,
        internal_marks: 18.0,
        max_internal_marks: 25.0,
        assignment_marks: 20.0,
        max_assignment_marks: 25.0,
        study_hours_per_week: 6.0,
        failures: 0,
        observed_final_score: ''
      });
    }
    setErrorMsg('');
  }, [initialStudent, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (!formData.student_id.trim()) return 'Student Roll/ID is required.';
    if (!formData.student_name.trim()) return 'Student Name is required.';
    if (!formData.department.trim()) return 'Department is required.';
    if (!formData.course_name.trim()) return 'Course / Subject is required.';

    const att = Number(formData.attendance_percentage);
    if (isNaN(att) || att < 0 || att > 100) {
      return 'Attendance percentage must be between 0.0 and 100.0%.';
    }

    const internal = Number(formData.internal_marks);
    const maxInternal = Number(formData.max_internal_marks);
    if (isNaN(internal) || internal < 0) return 'Internal marks cannot be negative.';
    if (internal > maxInternal) {
      return `Internal marks (${internal}) cannot exceed maximum internal marks (${maxInternal}).`;
    }

    const prev = Number(formData.previous_score);
    const maxPrev = Number(formData.max_previous_score);
    if (isNaN(prev) || prev < 0) return 'Previous score cannot be negative.';
    if (prev > maxPrev) {
      return `Previous score (${prev}) cannot exceed maximum previous score (${maxPrev}).`;
    }

    const assign = Number(formData.assignment_marks);
    const maxAssign = Number(formData.max_assignment_marks);
    if (isNaN(assign) || assign < 0) return 'Assignment marks cannot be negative.';
    if (assign > maxAssign) {
      return `Assignment marks (${assign}) cannot exceed maximum assignment marks (${maxAssign}).`;
    }

    const study = Number(formData.study_hours_per_week);
    if (isNaN(study) || study < 0) return 'Study hours cannot be negative.';

    const fails = Number(formData.failures);
    if (isNaN(fails) || fails < 0 || fails > 4) return 'Past failures must be between 0 and 4.';

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valError = validate();
    if (valError) {
      setErrorMsg(valError);
      return;
    }

    setErrorMsg('');
    setSubmitting(true);

    try {
      const payload = {
        dataset_id: datasetId,
        student_id: formData.student_id.trim(),
        student_name: formData.student_name.trim(),
        email: formData.email.trim() || null,
        department: formData.department.trim(),
        course_name: formData.course_name.trim(),
        semester: formData.semester.trim(),
        academic_year: formData.academic_year.trim(),
        attendance_percentage: Number(formData.attendance_percentage),
        previous_score: Number(formData.previous_score),
        max_previous_score: Number(formData.max_previous_score),
        internal_marks: Number(formData.internal_marks),
        max_internal_marks: Number(formData.max_internal_marks),
        assignment_marks: Number(formData.assignment_marks),
        max_assignment_marks: Number(formData.max_assignment_marks),
        study_hours_per_week: Number(formData.study_hours_per_week),
        failures: Number(formData.failures),
        observed_final_score: formData.observed_final_score !== '' ? Number(formData.observed_final_score) : null
      };

      if (isEditing) {
        await api.updateCollegeStudent(initialStudent.id, payload);
      } else {
        await api.createCollegeStudent(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save student record.');
    } finally {
      setSubmitting(false);
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
        position: 'relative',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)'
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 16,
          borderBottom: '1px solid #e2e8f0',
          marginBottom: 18
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {isEditing ? `Edit Student: ${formData.student_id}` : 'Add New College Student'}
            </h2>
            <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
              Add student marks, attendance, and details to your institutional cohort.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: 4
            }}
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
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Basic Identity */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
            <div>
              <label className="form-label">Student ID / Roll No *</label>
              <input
                type="text"
                className="form-input"
                required
                disabled={isEditing}
                placeholder="e.g. STU-2024-001"
                value={formData.student_id}
                onChange={(e) => handleChange('student_id', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Student Full Name *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Kavya Ramesh"
                value={formData.student_name}
                onChange={(e) => handleChange('student_name', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="kavya.r@college.edu"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>
          </div>

          {/* Section 2: Academic Program */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 14 }}>
            <div>
              <label className="form-label">Department *</label>
              <select
                className="form-select"
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Artificial Intelligence">Artificial Intelligence & DS</option>
                <option value="Electronics & Communication">Electronics & Communication</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Electrical Engineering">Electrical Engineering</option>
                <option value="Civil Engineering">Civil Engineering</option>
                <option value="Management Studies">Management Studies</option>
              </select>
            </div>
            <div>
              <label className="form-label">Course / Subject *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Data Structures"
                value={formData.course_name}
                onChange={(e) => handleChange('course_name', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Semester *</label>
              <select
                className="form-select"
                value={formData.semester}
                onChange={(e) => handleChange('semester', e.target.value)}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={`Semester ${s}`}>{`Semester ${s}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Academic Year</label>
              <input
                type="text"
                className="form-input"
                placeholder="2024-2025"
                value={formData.academic_year}
                onChange={(e) => handleChange('academic_year', e.target.value)}
              />
            </div>
          </div>

          {/* Section 3: Configurable Assessment Scales Toggle */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 12,
            marginBottom: 14
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#334155' }}>
                <Settings size={15} color="#2563eb" />
                Assessment Scale Configuration (Max Marks)
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: 11 }}
                onClick={() => setShowConfig(!showConfig)}
              >
                {showConfig ? 'Hide Settings' : 'Customize Max Marks'}
              </button>
            </div>

            {showConfig && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '1px dashed #cbd5e1' }}>
                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Max Internal Marks</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    className="form-input"
                    value={formData.max_internal_marks}
                    onChange={(e) => handleChange('max_internal_marks', e.target.value)}
                  />
                  <span style={{ fontSize: 10, color: '#64748b' }}>e.g. 20, 25, 30, 40, 50</span>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Max Previous Score</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    className="form-input"
                    value={formData.max_previous_score}
                    onChange={(e) => handleChange('max_previous_score', e.target.value)}
                  />
                  <span style={{ fontSize: 10, color: '#64748b' }}>e.g. 100 or 10.0 (CGPA)</span>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 11 }}>Max Assignment Marks</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    className="form-input"
                    value={formData.max_assignment_marks}
                    onChange={(e) => handleChange('max_assignment_marks', e.target.value)}
                  />
                  <span style={{ fontSize: 10, color: '#64748b' }}>e.g. 10, 20, 25, 50</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Student Scores & Performance */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
            <div>
              <label className="form-label">
                Internal Assessment Marks *
                <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>(out of {formData.max_internal_marks})</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max={formData.max_internal_marks}
                className="form-input"
                required
                value={formData.internal_marks}
                onChange={(e) => handleChange('internal_marks', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">
                Previous Academic Score *
                <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>(out of {formData.max_previous_score})</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max={formData.max_previous_score}
                className="form-input"
                required
                value={formData.previous_score}
                onChange={(e) => handleChange('previous_score', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">
                Assignment / Lab Marks
                <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>(out of {formData.max_assignment_marks})</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max={formData.max_assignment_marks}
                className="form-input"
                value={formData.assignment_marks}
                onChange={(e) => handleChange('assignment_marks', e.target.value)}
              />
            </div>
          </div>

          {/* Section 5: Attendance & Engagement */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 18 }}>
            <div>
              <label className="form-label">Attendance (%) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                className="form-input"
                required
                value={formData.attendance_percentage}
                onChange={(e) => handleChange('attendance_percentage', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Study Hours / Week</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="80"
                className="form-input"
                value={formData.study_hours_per_week}
                onChange={(e) => handleChange('study_hours_per_week', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Past Backlogs / Failures</label>
              <select
                className="form-select"
                value={formData.failures}
                onChange={(e) => handleChange('failures', Number(e.target.value))}
              >
                <option value={0}>0 Backlogs</option>
                <option value={1}>1 Backlog</option>
                <option value={2}>2 Backlogs</option>
                <option value={3}>3 Backlogs</option>
                <option value={4}>4+ Backlogs</option>
              </select>
            </div>
            <div>
              <label className="form-label">Observed Final Grade</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="form-input"
                placeholder="Optional (if graded)"
                value={formData.observed_final_score}
                onChange={(e) => handleChange('observed_final_score', e.target.value)}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              <Save size={16} />
              {submitting ? 'Saving...' : isEditing ? 'Update Student' : 'Save Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
