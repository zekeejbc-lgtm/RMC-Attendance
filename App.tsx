import { hierarchyPathForRole } from './lib/workspaceRoutes';

import React, { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import { ThemeProvider } from './components/ThemeContext';
import Layout from './components/ui/Layout';
import NavigationMemory from './components/NavigationMemory';
const RegisterStatus = lazy(() => import('./views/RegisterStatus'));
const Dashboard = lazy(() => import('./views/Dashboard'));
const StudentQR = lazy(() => import('./views/StudentQR'));
const StudentEvents = lazy(() => import('./views/StudentEvents'));
const StudentCeremonies = lazy(() => import('./views/StudentCeremonies'));
const StudentRecords = lazy(() => import('./views/StudentRecords'));
const StudentProfile = lazy(() => import('./views/StudentProfile'));
const MayorScanner = lazy(() => import('./views/MayorScanner'));
const SSGPanel = lazy(() => import('./views/SSGPanel'));
const ClassStudentDetail = lazy(() => import('./views/ClassStudentDetail'));
const StudentTransfers = lazy(() => import('./views/StudentTransfers'));
const SSGEventCreation = lazy(() => import('./views/SSGEventCreation'));
const SSGCreateCeremony = lazy(() => import('./views/SSGCreateCeremony'));
const SSGCreateEvent = lazy(() => import('./views/SSGCreateEvent'));
const LandingPage = lazy(() => import('./views/LandingPage'));
const LegalPage = lazy(() => import('./views/LegalPage'));
const Organizations = lazy(() => import('./views/Organizations'));
const GeneralEvent = lazy(() => import('./views/GeneralEvent'));
const OrganizationEvent = lazy(() => import('./views/OrganizationEvent'));

const AttendanceDashboard = lazy(() => import('./views/AttendanceDashboard'));
const OSSADashboard = lazy(() => import('./views/OSSADashboard'));
const AdminControls = lazy(() => import('./views/AdminControls'));
import { UserRole } from './types';
import { ossaSections, ossaSectionPath } from './lib/ossaHub';
import { hasPermission, AppPermission } from './lib/accessControl';
import { AppLoading, PageSkeleton } from './components/ui/Skeleton';
import ToastViewport from './components/ui/ToastViewport';
import PwaStatus from './components/ui/PwaStatus';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
  permission?: AppPermission;
  permissionAny?: AppPermission[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles, permission, permissionAny }) => {
  const { user, loading, profile, error, offlineScanner } = useAuth();
  const location = useLocation();

  if (loading) return <AppLoading label="Loading your workspace"><PageSkeleton /></AppLoading>;

  if (!user) return <Navigate to="/login" replace state={{ returnTo: location.pathname + location.search }} />;
  if (offlineScanner) {
    if (location.pathname !== '/mayor/scan') return <Navigate to="/mayor/scan" replace />;
    return <Layout>{children}</Layout>;
  }

  if (!profile && error) return <main className="mx-auto max-w-xl px-4 py-12 text-slate-800 dark:text-slate-100">
    <h1 className="text-2xl font-bold">Your workspace is unavailable</h1>
    <p className="mt-3">Reconnect and retry to load your records.</p>
  </main>;

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

// Keep saved links working while giving administrators their own hierarchy URL.
const HierarchyWorkspace: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const location = useLocation();
  const base = hierarchyPathForRole(profile?.role);
  const currentBase = location.pathname.startsWith('/admin/hierarchy') ? '/admin/hierarchy' : '/ssg/panel';
  if (base !== currentBase) return <Navigate replace to={`${base}${location.pathname.slice(currentBase.length)}${location.search}${location.hash}`} state={location.state} />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <PwaStatus>
      <ToastViewport />
      <AuthProvider>
        <HashRouter>
          <NavigationMemory>
          <Suspense fallback={<AppLoading label="Loading page"><PageSkeleton /></AppLoading>}><Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy-policy" element={<LegalPage kind="privacy" />} />
          <Route path="/data-deletion" element={<LegalPage kind="deletion" />} />
          <Route path="/data-privacy-agreement" element={<LegalPage kind="agreement" />} />
          <Route path="/terms-of-service" element={<LegalPage kind="terms" />} />
          <Route path="/login" element={<LandingPage defaultOpenLogin={true} />} />
          <Route path="/organizations/public" element={<Organizations publicDirectory />} />
          <Route path="/organizations" element={<ProtectedRoute><Organizations /></ProtectedRoute>} />
          <Route path="/organizations/:organizationId" element={<ProtectedRoute><Organizations /></ProtectedRoute>} />
          <Route path="/organizations/:organizationId/events/create" element={<ProtectedRoute><OrganizationEvent /></ProtectedRoute>} />
          <Route path="/organizations/:organizationId/events/:eventId/edit" element={<ProtectedRoute><OrganizationEvent /></ProtectedRoute>} />
          <Route path="/register" element={<LandingPage />} />
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

          <Route path="/student/events/:eventId" element={<ProtectedRoute roles={['student', 'mayor', 'ssg']}><GeneralEvent student /></ProtectedRoute>} />
          <Route path="/ssg/events/:eventId" element={<ProtectedRoute permission="events.manage" roles={['ssg', 'admin', 'ossa']}><GeneralEvent /></ProtectedRoute>} />
          <Route path="/organizations/:organizationId/events/:eventId" element={<ProtectedRoute><GeneralEvent /></ProtectedRoute>} />
          <Route path="/student/events" element={
            <ProtectedRoute roles={['student', 'mayor', 'ssg']}>
              <StudentEvents />
            </ProtectedRoute>
          } />

          <Route path="/student/ceremonies" element={
            <ProtectedRoute roles={['student', 'mayor', 'ssg', 'admin', 'ossa', 'ossa_staff']}>
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

          {['/ssg/panel', '/admin/hierarchy'].map(path => <Route key={path} path={path} element={
            <ProtectedRoute permissionAny={['directory.manage_structure', 'directory.manage_members', 'directory.transfer_students', 'attendance.scan', 'events.manage']} roles={['mayor', 'ssg', 'admin', 'ossa', 'ossa_staff']}>
              <HierarchyWorkspace><SSGPanel /></HierarchyWorkspace>
            </ProtectedRoute>
          } />)}

          {['/ssg/panel/students/:studentUid', '/admin/hierarchy/students/:studentUid'].map(path => <Route key={path} path={path} element={<ProtectedRoute permissionAny={['directory.manage_structure', 'directory.manage_members', 'directory.transfer_students', 'attendance.scan', 'events.manage']}><HierarchyWorkspace><ClassStudentDetail /></HierarchyWorkspace></ProtectedRoute>} />)}
          <Route path="/ssg/transfers" element={<ProtectedRoute permission="directory.transfer_students"><StudentTransfers /></ProtectedRoute>} />

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

          <Route path="/ssg/ceremonies/create" element={
            <ProtectedRoute permission="events.manage" roles={['ssg', 'admin', 'ossa']}>
              <SSGCreateCeremony />
            </ProtectedRoute>
          } />
          <Route path="/ssg/ceremonies/:eventId/edit" element={
            <ProtectedRoute permission="events.manage" roles={['ssg', 'admin', 'ossa']}>
              <SSGCreateCeremony />
            </ProtectedRoute>
          } />

          <Route path="/admin/attendance" element={
            <ProtectedRoute permission="attendance.manage" roles={['admin', 'ossa', 'ossa_staff']}>
              <AttendanceDashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin/controls" element={
            <ProtectedRoute permissionAny={['system.manage_accounts', 'system.manage_rbac', 'system.health', 'system.freeze', 'system.payment_reminders']}>
              <AdminControls />
            </ProtectedRoute>
          } />

          <Route path="/admin/members" element={
            <Navigate to="/admin/hierarchy" replace />
          } />

          <Route path="/ossa/dashboard" element={
            <ProtectedRoute permissionAny={['ossa.manage_cases', 'events.approve']} roles={['ossa', 'ossa_staff', 'admin']}>
              <OSSADashboard />
            </ProtectedRoute>
          } />
          <Route path="/ossa/dashboard/analytics" element={<Navigate to={ossaSectionPath('sanctions')} replace />} />
          {ossaSections.map(section => <Route key={section.id} path={ossaSectionPath(section.id)} element={
            <ProtectedRoute permission={section.permission}>
              <OSSADashboard section={section.id} />
            </ProtectedRoute>
          } />)}
          <Route path="/admin/accounts" element={
            <Navigate to="/admin/hierarchy" replace />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes></Suspense>
          </NavigationMemory>
      </HashRouter>
    </AuthProvider>
    </PwaStatus>
  </ThemeProvider>
  );
};

export default App;
