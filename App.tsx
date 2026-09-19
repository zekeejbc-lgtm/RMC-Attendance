
import React, { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import { ThemeProvider } from './components/ThemeContext';
import Layout from './components/ui/Layout';
const Register = lazy(() => import('./views/Register'));
const RegisterStatus = lazy(() => import('./views/RegisterStatus'));
const Dashboard = lazy(() => import('./views/Dashboard'));
const StudentQR = lazy(() => import('./views/StudentQR'));
const StudentEvents = lazy(() => import('./views/StudentEvents'));
const StudentCeremonies = lazy(() => import('./views/StudentCeremonies'));
const StudentRecords = lazy(() => import('./views/StudentRecords'));
const StudentProfile = lazy(() => import('./views/StudentProfile'));
const MayorScanner = lazy(() => import('./views/MayorScanner'));
const SSGPanel = lazy(() => import('./views/SSGPanel'));
const SSGEventCreation = lazy(() => import('./views/SSGEventCreation'));
const SSGCreateEvent = lazy(() => import('./views/SSGCreateEvent'));
const LandingPage = lazy(() => import('./views/LandingPage'));

const AttendanceDashboard = lazy(() => import('./views/AttendanceDashboard'));
const OSSADashboard = lazy(() => import('./views/OSSADashboard'));
const AdminControls = lazy(() => import('./views/AdminControls'));
import { UserRole } from './types';
import { hasPermission, AppPermission } from './lib/accessControl';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
  permission?: AppPermission;
  permissionAny?: AppPermission[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles, permission, permissionAny }) => {
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

  let isAllowed = true;
  if (permission) {
    isAllowed = hasPermission(profile.role, permission);
  } else if (permissionAny) {
    isAllowed = permissionAny.some(p => hasPermission(profile.role, p));
  } else if (roles) {
    isAllowed = roles.includes(profile.role);
  }

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <Suspense fallback={<div role="status" className="p-8">Loading page...</div>}><Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LandingPage defaultOpenLogin={true} />} />
          <Route path="/register" element={<LandingPage defaultOpenRegister={true} />} />
          <Route path="/register/status" element={<RegisterStatus />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/student/qr" element={
            <ProtectedRoute roles={['student', 'mayor', 'ssg']}>
              <StudentQR />
            </ProtectedRoute>
          } />

          <Route path="/student/events" element={
            <ProtectedRoute roles={['student', 'mayor', 'ssg']}>
              <StudentEvents />
            </ProtectedRoute>
          } />

          <Route path="/student/ceremonies" element={
            <ProtectedRoute roles={['student', 'mayor', 'ssg']}>
              <StudentCeremonies />
            </ProtectedRoute>
          } />

          <Route path="/student/records" element={
            <ProtectedRoute roles={['student', 'mayor', 'ssg']}>
              <StudentRecords />
            </ProtectedRoute>
          } />

          <Route path="/student/profile" element={
            <ProtectedRoute>
              <StudentProfile />
            </ProtectedRoute>
          } />

          <Route path="/mayor/scan" element={
            <ProtectedRoute permission="attendance.scan" roles={['mayor', 'ssg', 'admin', 'ossa', 'ossa_staff']}>
              <MayorScanner />
            </ProtectedRoute>
          } />

          <Route path="/ssg/panel" element={
            <ProtectedRoute permissionAny={['directory.manage_structure', 'directory.manage_members', 'attendance.scan', 'events.manage']} roles={['mayor', 'ssg', 'admin', 'ossa', 'ossa_staff']}>
              <SSGPanel />
            </ProtectedRoute>
          } />

          <Route path="/ssg/events" element={
            <ProtectedRoute permission="events.manage" roles={['ssg', 'admin', 'ossa']}>
              <SSGEventCreation />
            </ProtectedRoute>
          } />

          <Route path="/ssg/events/create" element={
            <ProtectedRoute permission="events.manage" roles={['ssg', 'admin', 'ossa']}>
              <SSGCreateEvent />
            </ProtectedRoute>
          } />
          <Route path="/ssg/events/:eventId/edit" element={
            <ProtectedRoute permission="events.manage" roles={['ssg', 'admin', 'ossa']}>
              <SSGCreateEvent />
            </ProtectedRoute>
          } />

          <Route path="/admin/attendance" element={
            <ProtectedRoute permission="attendance.manage" roles={['admin', 'ossa', 'ossa_staff']}>
              <AttendanceDashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin/controls" element={
            <ProtectedRoute permissionAny={['system.manage_rbac', 'system.health', 'system.freeze', 'system.payment_reminders']}>
              <AdminControls />
            </ProtectedRoute>
          } />

          <Route path="/admin/members" element={
            <Navigate to="/ssg/panel" replace />
          } />

          <Route path="/ossa/dashboard" element={
            <ProtectedRoute permission="ossa.manage_cases" roles={['ossa', 'ossa_staff', 'admin']}>
              <OSSADashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/accounts" element={
            <Navigate to="/ssg/panel" replace />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes></Suspense>
      </HashRouter>
    </AuthProvider>
  </ThemeProvider>
  );
};

export default App;
