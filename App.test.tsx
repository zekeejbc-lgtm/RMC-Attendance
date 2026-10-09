import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ auth: {} as any, applications: [] as any[], statusVisits: vi.fn() }));
vi.mock('./components/AuthContext', () => ({ AuthProvider: ({ children }: any) => children, useAuth: () => state.auth }));
vi.mock('./components/ThemeContext', () => ({ ThemeProvider: ({ children }: any) => children }));
vi.mock('./components/NavigationMemory', () => ({ default: ({ children }: any) => children }));
vi.mock('./components/ui/Layout', () => ({ default: ({ children }: any) => children }));
vi.mock('./components/ui/PwaStatus', () => ({ default: ({ children }: { children?: React.ReactNode }) => children }));
vi.mock('./components/ui/ToastViewport', () => ({ default: () => null }));
vi.mock('./lib/backend', () => ({ appData: { getApplications: () => state.applications } }));
vi.mock('./views/Dashboard', () => ({ default: () => <h1>Dashboard</h1> }));
vi.mock('./views/StudentTransfers', () => ({ default: () => <h1>Transfer students</h1> }));
vi.mock('./views/OSSADashboard', () => ({ default: ({ section = 'overview' }: any) => <h1>OSSA {section}</h1> }));
vi.mock('./views/RegisterStatus', () => ({ default: () => { state.statusVisits(); return <h1>Application status</h1>; } }));
vi.mock('./views/SSGPanel', () => ({ default: () => <h1>School hierarchy</h1> }));
vi.mock('./views/ClassStudentDetail', () => ({ default: () => <h1>Student detail</h1> }));
import App from './App';

beforeEach(() => {
  window.location.hash = '#/dashboard';
  state.statusVisits.mockClear();
  state.applications = [{ id: 'student', status: 'approved' }];
  state.auth = { user: { uid: 'student' }, profile: { uid: 'student', role: 'student', account_status: 'active' }, loading: false, approvalNoticeSeen: false };
});
afterEach(() => { cleanup(); window.location.hash = ''; });

it('opens the dashboard directly for an active account with an unseen approval notice', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: 'Dashboard' });
  expect(window.location.hash).toBe('#/dashboard');
  expect(state.statusVisits).not.toHaveBeenCalled();
});

it('waits for the profile during login without visiting application status', async () => {
  state.auth = { ...state.auth, loading: true, profile: null };
  const view = render(<App />);
  await screen.findByRole('status', { name: 'Loading your workspace' });
  expect(state.statusVisits).not.toHaveBeenCalled();
  state.auth = { ...state.auth, loading: false, profile: { uid: 'student', role: 'student', account_status: 'active' } };
  view.rerender(<App />);
  await screen.findByRole('heading', { name: 'Dashboard' });
  expect(state.statusVisits).not.toHaveBeenCalled();
});

it('still directs applicants without an active profile to application status', async () => {
  state.auth.profile = null;
  state.applications = [{ id: 'student', status: 'pending' }];
  render(<App />);
  await screen.findByRole('heading', { name: 'Application status' });
  expect(window.location.hash).toBe('#/register/status');
  expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument();
});

it('opens the dedicated transfer route for an authorized administrator', async () => {
  state.auth.profile.role = 'admin';
  window.location.hash = '#/ssg/transfers?unit=class-a';
  render(<App />);
  await screen.findByRole('heading', { name: 'Transfer students' });
  expect(window.location.hash).toBe('#/ssg/transfers?unit=class-a');
});

it('redirects students who open the transfer route without permission', async () => {
  window.location.hash = '#/ssg/transfers';
  render(<App />);
  await screen.findByRole('heading', { name: 'Dashboard' });
  expect(window.location.hash).toBe('#/dashboard');
  expect(screen.queryByRole('heading', { name: 'Transfer students' })).not.toBeInTheDocument();
});

it.each(['activities', 'requests', 'sanctions', 'excuses', 'analytics', 'organizations'])('opens the OSSA %s subpage directly', async section => {
  state.auth.profile.role = 'ossa';
  window.location.hash = `#/ossa/dashboard/${section}`;
  render(<App />);
  await screen.findByRole('heading', { name: `OSSA ${section}` });
  expect(window.location.hash).toBe(`#/ossa/dashboard/${section}`);
});

it('denies a student access to the OSSA request subpage', async () => {
  window.location.hash = '#/ossa/dashboard/requests';
  render(<App />);
  await screen.findByRole('heading', { name: 'Dashboard' });
  expect(window.location.hash).toBe('#/dashboard');
});


it.each([
  ['/ssg/panel?unit=class-a&tab=hub', '/admin/hierarchy?unit=class-a&tab=hub', 'School hierarchy'],
  ['/ssg/panel/students/student-1?unit=class-a', '/admin/hierarchy/students/student-1?unit=class-a', 'Student detail'],
  ['/admin/hierarchy', '/admin/hierarchy', 'School hierarchy'],
])('opens the admin hierarchy and preserves saved context from %s', async (source, target, heading) => {
  state.auth.profile.role = 'admin';
  window.location.hash = `#${source}`;
  render(<App />);
  await screen.findByRole('heading', { name: heading });
  expect(window.location.hash).toBe(`#${target}`);
});

it('keeps an SSG officer in the SSG workspace when opening an admin hierarchy link', async () => {
  state.auth.profile.role = 'ssg';
  window.location.hash = '#/admin/hierarchy?unit=class-a';
  render(<App />);
  await screen.findByRole('heading', { name: 'School hierarchy' });
  expect(window.location.hash).toBe('#/ssg/panel?unit=class-a');
});

it('denies a student access to the admin hierarchy', async () => {
  window.location.hash = '#/admin/hierarchy';
  render(<App />);
  await screen.findByRole('heading', { name: 'Dashboard' });
  expect(window.location.hash).toBe('#/dashboard');
});
