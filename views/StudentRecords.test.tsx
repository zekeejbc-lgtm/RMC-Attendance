import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import StudentRecords from './StudentRecords';

vi.mock('../components/AuthContext', () => ({ useAuth: () => ({ profile: { uid: 'student-1' }, revision: 1, stats: {} }) }));
vi.mock('../lib/backend', () => {
  const event = { id: 'event-1', title: 'Intramurals', kind: 'attendance', startTime: Date.parse('2026-10-02T16:00:00Z'), endTime: Date.parse('2026-10-03T09:00:00Z'), venue: 'RMC Gym', attendanceWindows: [{ id: 'morning', label: 'Morning session' }] };
  return { appData: {
    getAttendanceRecords: () => [{ id: 'record-1', event, slot: '2026-10-03:morning', status: 'present', time_in: Date.parse('2026-10-02T16:08:02Z'), time_out: Date.parse('2026-10-03T04:00:00Z'), scanned_by_name: 'Regal Admin', rendered_hours: 2 }],
    getEvents: () => [event],
    getUserDetail: () => ({ sanction_logs: [{ id: 'sanction-1', reason: 'Late attendance', change: 1, timestamp: Date.parse('2026-10-02T16:08:02Z'), performed_by: 'Regal Admin' }] }),
  } };
});
afterEach(cleanup);

it('opens attendance details from a mobile card and closes with Escape', () => {
  render(<StudentRecords />);
  const card = screen.getByRole('button', { name: 'Intramurals / Morning session' });
  expect(within(card).getByText('12:08:02 AM')).toBeInTheDocument();
  card.focus();
  fireEvent.keyDown(card, { key: 'Enter' });
  const dialog = screen.getByRole('dialog', { name: 'Attendance details' });
  expect(within(dialog).getByText('RMC Gym')).toBeInTheDocument();
  expect(within(dialog).getByText('10/3/2026, 12:00:00 PM')).toBeInTheDocument();
  expect(within(dialog).getByText('Regal Admin')).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(card).toHaveFocus();
});

it('opens attendance details from the desktop title and sanction details from its card', () => {
  render(<StudentRecords />);
  fireEvent.click(screen.getByRole('button', { name: /Intramurals.*View details/i }));
  expect(screen.getByRole('dialog', { name: 'Attendance details' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
  fireEvent.click(screen.getByRole('button', { name: 'View sanction details: Late attendance' }));
  const dialog = screen.getByRole('dialog', { name: 'Sanction details' });
  expect(within(dialog).getByText('10/3/2026, 12:08:02 AM')).toBeInTheDocument();
  expect(within(dialog).getByText('+1 hours')).toBeInTheDocument();
});
