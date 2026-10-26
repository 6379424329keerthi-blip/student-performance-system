import React, { useState } from 'react';
import { DatasetProvider } from './context/DatasetContext';
import MainLayout from './layouts/MainLayout';
import OverviewPage from './pages/OverviewPage';
import StudentsPage from './pages/StudentsPage';
import PredictionPage from './pages/PredictionPage';
import AnalyticsPage from './pages/AnalyticsPage';
import DatasetExplorerPage from './pages/DatasetExplorerPage';
import ModelEvaluationPage from './pages/ModelEvaluationPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import PredictionDetailModal from './components/PredictionDetailModal';

export default function App() {
  const [activePage, setActivePage] = useState('overview');
  const [selectedStudentForPredict, setSelectedStudentForPredict] = useState(null);
  const [inspectPredictionId, setInspectPredictionId] = useState(null);

  const handleNavigateToPredict = () => {
    setActivePage('prediction');
  };

  const handleSelectStudentToPredict = (studentObj) => {
    if (studentObj.internal_marks !== undefined || studentObj.student_name) {
      setSelectedStudentForPredict(studentObj);
    } else {
      setSelectedStudentForPredict({
        student_identifier: studentObj.student_id,
        course: studentObj.course,
        G1: studentObj.G1,
        failures: studentObj.failures,
        absences: studentObj.absences,
        studytime: studentObj.studytime,
        schoolsup: studentObj.schoolsup,
        famsup: studentObj.famsup,
        paid: studentObj.paid,
        higher: studentObj.higher,
        school: studentObj.school,
        sex: studentObj.sex,
        age: studentObj.age,
        address: studentObj.address,
        famsize: studentObj.famsize,
        Pstatus: studentObj.Pstatus,
        Medu: studentObj.Medu,
        Fedu: studentObj.Fedu,
        Mjob: studentObj.Mjob,
        Fjob: studentObj.Fjob,
        reason: studentObj.reason,
        guardian: studentObj.guardian,
        traveltime: studentObj.traveltime,
        activities: studentObj.activities,
        nursery: studentObj.nursery,
        internet: studentObj.internet,
        romantic: studentObj.romantic,
        famrel: studentObj.famrel,
        freetime: studentObj.freetime,
        goout: studentObj.goout,
        Dalc: studentObj.Dalc,
        Walc: studentObj.Walc,
        health: studentObj.health
      });
    }
    setActivePage('prediction');
  };

  const handleInspectPrediction = (id) => {
    setInspectPredictionId(id);
  };

  const renderContent = () => {
    switch (activePage) {
      case 'overview':
        return (
          <OverviewPage
            onNavigateToPredict={handleNavigateToPredict}
            onSelectPredictionDetail={handleInspectPrediction}
          />
        );
      case 'students':
        return (
          <StudentsPage
            onSelectStudentToPredict={handleSelectStudentToPredict}
          />
        );
      case 'prediction':
        return (
          <PredictionPage
            initialFormData={selectedStudentForPredict}
          />
        );
      case 'analytics':
        return <AnalyticsPage />;
      case 'dataset':
        return <DatasetExplorerPage />;
      case 'evaluation':
        return <ModelEvaluationPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <OverviewPage onNavigateToPredict={handleNavigateToPredict} />;
    }
  };

  return (
    <DatasetProvider>
      <MainLayout activePage={activePage} setActivePage={setActivePage}>
        {renderContent()}

        {inspectPredictionId && (
          <PredictionDetailModal
            predictionId={inspectPredictionId}
            onClose={() => setInspectPredictionId(null)}
          />
        )}
      </MainLayout>
    </DatasetProvider>
  );
}
