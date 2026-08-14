
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import { ThemeProvider } from './components/ThemeContext';
import Layout from './components/ui/Layout';
import Register from './views/Register';
import RegisterStatus from './views/RegisterStatus';
import Dashboard from './views/Dashboard';
import StudentQR from './views/StudentQR';
import StudentEvents from './views/StudentEvents';
import StudentCeremonies from './views/StudentCeremonies';
import StudentRecords from './views/StudentRecords';
import StudentProfile from './views/StudentProfile';
import MayorScanner from './views/MayorScanner';
import SSGPanel from './views/SSGPanel';
import SSGEventCreation from './views/SSGEventCreation';
import SSGCreateEvent from './views/SSGCreateEvent';
import LandingPage from './views/LandingPage';

import AttendanceDashboard from './views/AttendanceDashboard';
import ManageMembers from './views/ManageMembers';
import OSSADashboard from './views/OSSADashboard';

const ProtectedRoute: React.FC<{ children: React.ReactNode, roles?: string[] }> = ({ children, roles }) => {
  const { user, loading, profile } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-400"></div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  // If authenticated but no profile, they are likely still in the application phase
  if (!profile) {
    return <Navigate to="/register/status" replace />;
  }

  // Administrators have the highest access level. Student-only navigation is
  // hidden from their sidebar, but direct access remains available for support.
  if (profile.role === 'admin') return <Layout>{children}</Layout>;

  // Handle OSSA role routing
  if (profile.role === 'ossa') {
    if (!roles || !roles.includes('ossa')) {
      return <Navigate to="/ossa/dashboard" replace />;
    }
  } else if (roles && !roles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LandingPage defaultOpenLogin={true} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/status" element={<RegisterStatus />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/student/qr" element={
            <ProtectedRoute roles={['student', 'mayor']}>
              <StudentQR />
            </ProtectedRoute>
          } />

          <Route path="/student/events" element={
            <ProtectedRoute roles={['student', 'mayor']}>
              <StudentEvents />
            </ProtectedRoute>
          } />

          <Route path="/student/ceremonies" element={
            <ProtectedRoute roles={['student', 'mayor']}>
              <StudentCeremonies />
            </ProtectedRoute>
          } />

          <Route path="/student/records" element={
            <ProtectedRoute roles={['student', 'mayor']}>
              <StudentRecords />
            </ProtectedRoute>
          } />

          <Route path="/student/profile" element={
            <ProtectedRoute roles={['student', 'mayor', 'ssg', 'admin', 'ossa']}>
              <StudentProfile />
            </ProtectedRoute>
          } />

          <Route path="/mayor/scan" element={
            <ProtectedRoute roles={['mayor', 'ssg', 'admin', 'ossa']}>
              <MayorScanner />
            </ProtectedRoute>
          } />

          <Route path="/ssg/panel" element={
            <ProtectedRoute roles={['ssg', 'admin', 'ossa']}>
              <SSGPanel />
            </ProtectedRoute>
          } />

          <Route path="/ssg/events" element={
            <ProtectedRoute roles={['ssg', 'admin', 'ossa']}>
              <SSGEventCreation />
            </ProtectedRoute>
          } />

          <Route path="/ssg/events/create" element={
            <ProtectedRoute roles={['ssg', 'admin', 'ossa']}>
              <SSGCreateEvent />
            </ProtectedRoute>
          } />
          <Route path="/ssg/events/:eventId/edit" element={
            <ProtectedRoute roles={['ssg', 'admin', 'ossa']}>
              <SSGCreateEvent />
            </ProtectedRoute>
          } />

          <Route path="/admin/attendance" element={
            <ProtectedRoute roles={['admin', 'ossa']}>
              <AttendanceDashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin/members" element={
            <ProtectedRoute roles={['ssg', 'admin', 'ossa']}>
              <ManageMembers />
            </ProtectedRoute>
          } />

          <Route path="/ossa/dashboard" element={
            <ProtectedRoute roles={['ossa', 'admin']}>
              <OSSADashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </HashRouter>
    </AuthProvider>
  </ThemeProvider>
  );
};

export default App;
