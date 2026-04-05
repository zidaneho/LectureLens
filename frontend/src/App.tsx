import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import AnalysisView from './pages/AnalysisView';
import Dashboard from './pages/Dashboard';
import MainLayout from './components/MainLayout';
import './App.css';

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/analysis" element={<AnalysisView />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
