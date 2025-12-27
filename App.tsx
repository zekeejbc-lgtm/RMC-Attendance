
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import Layout from './components/ui/Layout';
import Login from './views/Login';
import Register from './views/Register';
import RegisterStatus from './views/RegisterStatus';
import Dashboard from './views/Dashboard';
import StudentQR from './views/StudentQR';
import MayorScanner from './views/MayorScanner';
import SSGPanel from './views/SSGPanel';

const ProtectedRoute: React.FC<{ children: React.ReactNode, roles?: string[] }> = ({ children, roles }) => {
  const { user, loading, profile } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-400"></div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  // If authenticated but no profile, they are likely still in the application phase
  if (!profile) {
    return <Navigate to="/register/status" />;
  }

  if (roles && !roles.includes(profile.role)) {
    return <Navigate to="/dashboard" />;
  }

  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/status" element={<RegisterStatus />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/student/qr" element={
            <ProtectedRoute roles={['student', 'mayor', 'ssg', 'admin']}>
              <StudentQR />
            </ProtectedRoute>
          } />

          <Route path="/mayor/scan" element={
            <ProtectedRoute roles={['mayor', 'ssg', 'admin']}>
              <MayorScanner />
            </ProtectedRoute>
          } />

          <Route path="/ssg/panel" element={
            <ProtectedRoute roles={['ssg', 'admin']}>
              <SSGPanel />
            </ProtectedRoute>
          } />

          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
