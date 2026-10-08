import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { Notifications } from './Notifications';

const state = vi.hoisted(() => ({ uid: 'student-1', events: [] as any[], records: [] as any[] }));
vi.mock('../AuthContext', () => ({ useAuth: () => ({ profile: { uid: state.uid, role: 'student' } }) }));
vi.mock('../../lib/backend', () => ({ appData: {
  getRecipientEvents: vi.fn(() => state.events),
  getAttendanceRecords: vi.fn(() => state.records),
} }));
afterEach(() => { cleanup(); localStorage.clear(); state.uid = 'student-1'; state.events = []; state.records = []; });
function Location() { return <p data-testid="location">{useLocation().pathname}</p>; }
function mount() { return render(<MemoryRouter><Notifications /><Location /></MemoryRouter>); }

it.each([0, 1])('opens and closes notifications from trigger %i, including an honest empty state', async index => {
  const user = userEvent.setup();
  mount();
  const trigger = screen.getAllByRole('button', { name: 'Notifications' })[index];
  await user.click(trigger);
  expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeVisible();
  expect(screen.getByText(/No notifications yet/)).toBeVisible();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it('shows relevant events and attendance, marks items read and opens their destination', async () => {
  state.events = [{ id: 'event-1', title: 'Assembly', status: 'upcoming', startTime: Date.now() + 60000, endTime: Date.now() + 120000 },
    { id: 'event-2', title: 'Old assembly', status: 'done', startTime: 1, endTime: 2 }];
  state.records = [{ id: 'record-1', event: { title: 'Flag ceremony' }, status: 'present', recorded_at: Date.now() }];
  const user = userEvent.setup();
  const view = mount();
  expect(screen.getAllByLabelText('2 unread notifications')).toHaveLength(2);
  await user.click(screen.getAllByRole('button', { name: 'Notifications' })[0]);
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).queryByText(/Old assembly/)).not.toBeInTheDocument();
  await user.click(within(dialog).getByRole('button', { name: /Attendance: Flag ceremony/ }));
  expect(screen.getByTestId('location')).toHaveTextContent('/student/records');
  expect(screen.getAllByLabelText('1 unread notifications')).toHaveLength(2);
  await user.click(screen.getAllByRole('button', { name: 'Notifications' })[1]);
  await user.click(screen.getByRole('button', { name: 'Mark all as read' }));
  expect(screen.queryByLabelText('1 unread notifications')).not.toBeInTheDocument();
  view.unmount();
  mount();
  expect(screen.queryByLabelText('2 unread notifications')).not.toBeInTheDocument();
  state.uid = 'student-2';
  cleanup();
  mount();
  expect(screen.getAllByLabelText('2 unread notifications')).toHaveLength(2);
});
