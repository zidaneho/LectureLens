import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import AnalysisView from './pages/AnalysisView';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MainLayout from './components/MainLayout';
import PrivateRoute from './components/PrivateRoute';
import { SettingsProvider } from './SettingsContext';
import { ThemeProvider } from './ThemeContext';
import './App.css';

function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            {/* Auth Routes - No MainLayout */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected Routes - With MainLayout */}
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <MainLayout>
                    <Routes>
                      <Route path="/" element={<Landing />} />
                      <Route path="/analysis" element={<AnalysisView />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </MainLayout>
                </PrivateRoute>
              }
            />
          </Routes>
        </Router>
      </ThemeProvider>
    </SettingsProvider>
  );
}

export default App;
