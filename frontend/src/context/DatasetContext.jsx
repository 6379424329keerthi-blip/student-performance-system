import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const DatasetContext = createContext();

export const UCI_BENCHMARK_OPTION = {
  id: 'uci',
  name: 'UCI Student Performance Benchmark (Cortez & Silva 2008)',
  description: 'Standard benchmark dataset with 1,044 secondary education records across Math & Portuguese.',
  department: 'Benchmark School System',
  semester: 'All Semesters',
  academic_year: 'Historical Benchmark',
  is_system_benchmark: 1,
  student_count: 1044
};

export function DatasetProvider({ children }) {
  const [activeDatasetId, setActiveDatasetIdState] = useState(() => {
    return localStorage.getItem('student_analytics_active_dataset') || 'uci';
  });
  const [datasets, setDatasets] = useState([UCI_BENCHMARK_OPTION]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);

  const fetchDatasets = async () => {
    setLoadingDatasets(true);
    try {
      const list = await api.getDatasets();
      const combined = [
        UCI_BENCHMARK_OPTION,
        ...list.map((d) => ({
          ...d,
          id: String(d.id),
          is_system_benchmark: 0
        }))
      ];
      setDatasets(combined);

      // If activeDatasetId is not in the list, fall back to 'uci'
      const exists = combined.some((d) => d.id === activeDatasetId);
      if (!exists && activeDatasetId !== 'uci') {
        setActiveDatasetIdState('uci');
        localStorage.setItem('student_analytics_active_dataset', 'uci');
      }
    } catch (e) {
      console.error('Failed to load datasets list in context:', e);
    } finally {
      setLoadingDatasets(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const setActiveDatasetId = (id) => {
    const strId = String(id);
    setActiveDatasetIdState(strId);
    localStorage.setItem('student_analytics_active_dataset', strId);
  };

  const isBenchmark = activeDatasetId === 'uci' || activeDatasetId === '0';
  const activeDataset = datasets.find((d) => d.id === activeDatasetId) || UCI_BENCHMARK_OPTION;

  return (
    <DatasetContext.Provider
      value={{
        activeDatasetId,
        setActiveDatasetId,
        isBenchmark,
        activeDataset,
        datasets,
        loadingDatasets,
        refreshDatasets: fetchDatasets
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
}

export function useDataset() {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
}

export default DatasetContext;
