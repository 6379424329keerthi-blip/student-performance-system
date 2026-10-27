/**
 * Centralized API Client for Smart Student Performance Backend
 * Supports both local development (via Vite proxy) and production cloud deployment (e.g., Render, Hugging Face).
 */

// Base URL configuration:
// 1. If VITE_API_BASE_URL is explicitly set (e.g. from GitHub Actions vars/secrets or .env), use it.
// 2. In cloud environments (non-localhost, like GitHub Pages), fallback to the deployed Render backend URL.
// 3. In local development (localhost / 127.0.0.1), fallback to relative '/api' which Vite proxies to local FastAPI (:8000).
const DEFAULT_RENDER_URL = 'https://student-performance-api.onrender.com';

const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '0.0.0.0'
);

const envBase = import.meta.env.VITE_API_BASE_URL;
const rawBase = envBase || (!isLocalhost ? DEFAULT_RENDER_URL : '');
const API_BASE = rawBase ? `${rawBase.replace(/\/$/, '')}/api` : '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      let errMsg = `API error (${res.status})`;
      try {
        const errData = await res.json();
        errMsg = errData.detail || errMsg;
      } catch (e) {
        // fallback
      }
      throw new Error(errMsg);
    }
    return await res.json();
  } catch (err) {
    console.error(`[API Request Error] ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Health
  getHealth: () => request('/health'),

  // Overview KPIs & Summary (Dataset-Aware)
  getOverview: (datasetId) => {
    const q = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : '';
    return request(`/overview${q}`);
  },

  // Dataset Explorer (Dataset-Aware)
  getDatasetSummary: (datasetId) => {
    const q = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : '';
    return request(`/dataset/summary${q}`);
  },
  getDatasetColumns: () => request('/dataset/columns'),
  getDatasetRecords: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, v);
      }
    });
    return request(`/dataset/records?${query.toString()}`);
  },

  // Analytics (Dataset-Aware)
  getPerformanceAnalytics: (datasetId) => {
    const q = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : '';
    return request(`/analytics/performance${q}`);
  },
  getRiskAnalytics: (datasetId) => {
    const q = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : '';
    return request(`/analytics/risk${q}`);
  },

  // Machine Learning Models & Evaluation (Dataset-Aware)
  getModels: (datasetId) => {
    const q = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : '';
    return request(`/models${q}`);
  },
  getModelsComparison: (datasetId) => {
    const q = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : '';
    return request(`/models/comparison${q}`);
  },
  getFeatureImportance: (datasetId) => {
    const q = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : '';
    return request(`/models/feature-importance${q}`);
  },
  getBestModelMetrics: (datasetId) => {
    const q = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : '';
    return request(`/models/metrics${q}`);
  },

  // Real-Time Predictions & Explanations
  predictStudent: (payload) => request('/predict', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Prediction History in SQLite
  getPredictions: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, v);
      }
    });
    return request(`/predictions?${query.toString()}`);
  },
  getPredictionDetail: (id) => request(`/predictions/${id}`),
  deletePrediction: (id) => request(`/predictions/${id}`, { method: 'DELETE' }),

  // Academic Reports & Exports (Dataset-Aware)
  getReportsSummary: (datasetId) => {
    const q = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : '';
    return request(`/reports/summary${q}`);
  },
  getExportUrl: (format = 'csv', datasetId) => {
    const q = datasetId ? `&dataset_id=${encodeURIComponent(datasetId)}` : '';
    return `${API_BASE}/reports/export?format=${format}${q}`;
  },

  // College Cohorts & Datasets
  getDatasets: () => request('/college/datasets'),
  createDataset: (payload) => request('/college/datasets', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  deleteDataset: (id) => request(`/college/datasets/${id}`, { method: 'DELETE' }),
  previewSpreadsheet: async (formData) => {
    const url = `${API_BASE}/college/datasets/preview`;
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      let errMsg = `Upload error (${res.status})`;
      try {
        const errData = await res.json();
        errMsg = errData.detail || errMsg;
      } catch (e) {}
      throw new Error(errMsg);
    }
    return await res.json();
  },
  validateDatasetFile: async (formData) => {
    const url = `${API_BASE}/college/datasets/validate-file`;
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      let errMsg = `Validation error (${res.status})`;
      try {
        const errData = await res.json();
        errMsg = errData.detail || errMsg;
      } catch (e) {}
      throw new Error(errMsg);
    }
    return await res.json();
  },
  importDatasetFile: async (formData) => {
    const url = `${API_BASE}/college/datasets/import-file`;
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      let errMsg = `Import error (${res.status})`;
      try {
        const errData = await res.json();
        errMsg = errData.detail || errMsg;
      } catch (e) {}
      throw new Error(errMsg);
    }
    return await res.json();
  },
  validateDatasetUpload: (payload) => request('/college/datasets/validate', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  importDataset: (payload) => request('/college/datasets/import', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getCollegeTemplateUrl: () => `${API_BASE}/college/datasets/template`,
  getCollegeExportUrl: (datasetId) => `${API_BASE}/college/datasets/${datasetId}/export`,
  getImportHistory: (datasetId) => request(`/college/datasets/${datasetId}/imports`),
  getBaseUrl: () => API_BASE,

  // College Students CRUD & ML Inference
  getCollegeStudents: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, v);
      }
    });
    return request(`/college/students?${query.toString()}`);
  },
  getCollegeStudentDetail: (id) => request(`/college/students/${id}`),
  createCollegeStudent: (payload) => request('/college/students', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateCollegeStudent: (id, payload) => request(`/college/students/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  deleteCollegeStudent: (id) => request(`/college/students/${id}`, { method: 'DELETE' }),
  predictCollegeStudent: (id) => request(`/college/students/${id}/predict`, { method: 'POST' }),
  batchPredictCollegeStudents: (payload) => request('/college/students/batch-predict', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getCollegeStudentPredictions: (id) => request(`/college/students/${id}/predictions`),

  // College Dynamic Analytics
  getCollegeAnalyticsSummary: (datasetId = 1) => request(`/college/analytics/summary?dataset_id=${datasetId}`),
};

export default api;
