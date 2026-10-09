import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import OSSADashboard from './OSSADashboard';
const state = vi.hoisted(() => ({ permissions: ['ossa.manage_cases', 'events.approve'], profile: { uid: 'officer', role: 'ossa' } }));
vi.mock('../components/AuthContext', () => ({ useAuth: () => ({ profile: state.profile, user: { uid: 'officer' } }) }));
vi.mock('../lib/accessControl', () => ({ hasPermission: (_: unknown, permission: string) => state.permissions.includes(permission) }));
vi.mock('../lib/backend', () => ({ refreshData: vi.fn(async () => {}), appData: { getAllStudents: () => [], getExcuseApplications: () => [], getCustomRoles: () => [], getCoreRoles: () => [], getOrganizations: () => [], getEvents: () => [], getOrganizationSanctions: () => [] } }));
vi.mock('../components/events/ActivityApprovalQueue', () => ({ default: () => <div>Activity review queue</div> }));
vi.mock('../components/members/ProfileRequests', () => ({ default: () => <div>Student information review queue</div> }));
beforeEach(() => { state.permissions = ['ossa.manage_cases', 'events.approve']; });
afterEach(() => { cleanup(); });
const renderPage = (section?: Parameters<typeof OSSADashboard>[0]['section']) => render(<MemoryRouter><OSSADashboard section={section} /></MemoryRouter>);
it('organizes the hub into linked workspaces without embedding queues or charts', () => {
 renderPage();
 expect(screen.getByRole('heading', { name: 'OSSA Hub' })).toBeVisible();
 const pages = { 'Event & ceremony approvals': 'activities', 'Student information requests': 'requests', 'Student sanctions': 'sanctions', 'Excuse applications': 'excuses', 'Sanction analytics': 'analytics', 'Organization approvals': 'organizations' };
 for (const [name, path] of Object.entries(pages)) expect(screen.getByRole('link', { name: new RegExp(name.replace('&', '&') + '.*Open workspace', 'i') })).toHaveAttribute('href', `/ossa/dashboard/${path}`);
 expect(screen.queryByText('Activity review queue')).not.toBeInTheDocument();
 expect(screen.queryByText('Student information review queue')).not.toBeInTheDocument();
 expect(screen.queryByRole('region', { name: 'Sanction status chart' })).not.toBeInTheDocument();
 expect(screen.queryByLabelText('Search student sanctions')).not.toBeInTheDocument();
});
it('opens information requests independently with a link back to the hub', () => {
 renderPage('requests');
 expect(screen.getByText('Student information review queue')).toBeVisible();
 expect(screen.queryByText('Activity review queue')).not.toBeInTheDocument();
 expect(screen.getByRole('link', { name: 'OSSA Hub' })).toHaveAttribute('href', '/ossa/dashboard');
 expect(screen.queryByRole('link', { name: 'Student information requests' })).not.toBeInTheDocument();
});
it('opens the sanction roster separately from excuses', () => {
 renderPage('sanctions');
 expect(screen.getByRole('heading', { name: 'Student Sanction Roster' })).toBeVisible();
 expect(screen.getByLabelText('Search student sanctions')).toBeVisible();
 expect(screen.queryByText('Student Absence & Medical Excuse Queue')).not.toBeInTheDocument();
 expect(screen.getByRole('button', { name: 'Export roster CSV' })).toBeVisible();
});
it('opens the excuse queue without the sanction roster', () => {
 renderPage('excuses');
 expect(screen.getByRole('heading', { name: 'Excuse application queue' })).toBeVisible();
 expect(screen.queryByRole('heading', { name: 'Student Sanction Roster' })).not.toBeInTheDocument();
 expect(screen.queryByRole('button', { name: 'Export roster CSV' })).not.toBeInTheDocument();
});
it('shows only the workspaces allowed by the officer permissions', () => {
 state.permissions = ['events.approve']; renderPage();
 expect(screen.getByRole('link', { name: /Event & ceremony approvals.*Open workspace/i })).toBeVisible();
 expect(screen.queryByRole('link', { name: /Student information requests/i })).not.toBeInTheDocument();
 expect(screen.queryByLabelText('OSSA summary')).not.toBeInTheDocument();
});
