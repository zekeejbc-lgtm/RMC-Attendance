import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import RegisterStatus from './RegisterStatus';

const api = vi.hoisted(() => ({ claim: vi.fn(), navigate: vi.fn(), profile: null as any, application: null as any }));
vi.mock('react-router-dom', () => ({ useNavigate: () => api.navigate }));
vi.mock('../components/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'student' }, profile: api.profile, loading: false }) }));
vi.mock('../lib/approvalNotice', () => ({ claimApprovalNotice: api.claim }));
vi.mock('../lib/backend', () => ({ appData: { getApplications: () => api.application ? [api.application] : [] }, appAuth: {}, refreshData: vi.fn() }));
vi.mock('../components/ui/ThemeToggle', () => ({ default: () => null }));
beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); api.profile = { uid: 'student' }; api.application = null; });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('shows the first approval with a time bar and opens the dashboard after eight seconds', async () => {
  api.claim.mockResolvedValue(true);
  await act(async () => { render(<RegisterStatus />); });
  expect(screen.getByText('Account approved')).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '8');
  act(() => vi.advanceTimersByTime(8000));
  expect(api.navigate).toHaveBeenCalledWith('/dashboard', { replace: true });
});
it('skips an approval already recorded in the backend', async () => {
  api.claim.mockResolvedValue(false);
  await act(async () => { render(<RegisterStatus />); });
  expect(screen.queryByText('Account approved')).toBeNull();
  expect(api.navigate).toHaveBeenCalledWith('/dashboard', { replace: true });
});
it('allows opening the dashboard before the countdown ends', async () => {
  api.claim.mockResolvedValue(true);
  await act(async () => { render(<RegisterStatus />); });
  fireEvent.click(screen.getByRole('button', { name: 'Open dashboard' }));
  expect(api.navigate).toHaveBeenCalledWith('/dashboard', { replace: true });
});
it('offers retry when the record cannot be saved', async () => {
  api.claim.mockRejectedValue(new Error('Offline'));
  await act(async () => { render(<RegisterStatus />); });
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to save');
  act(() => vi.advanceTimersByTime(10000));
  expect(api.navigate).not.toHaveBeenCalled();
  api.claim.mockResolvedValue(true);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Try again' })); });
  expect(screen.getByText('Account approved')).toBeInTheDocument();
});
it('keeps pending applications open without a countdown or approval write', async () => {
  api.profile = null;
  api.application = { id: 'student', status: 'pending', form_data: {} };
  await act(async () => { render(<RegisterStatus />); });
  expect(screen.getByText('Admission review pending')).toBeInTheDocument();
  expect(screen.queryByRole('progressbar')).toBeNull();
  expect(api.claim).not.toHaveBeenCalled();
});
