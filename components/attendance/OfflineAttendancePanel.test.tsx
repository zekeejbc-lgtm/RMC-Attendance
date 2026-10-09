import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { AppEvent } from '../../types';
import OfflineAttendancePanel from './OfflineAttendancePanel';

const prepare = vi.hoisted(() => vi.fn());
vi.mock('../../lib/offlineAttendance', () => ({ prepareOfflineAttendance: prepare }));
const data = { rosters: [], queue: [], error: '', online: true };
const event = (fields: Partial<AppEvent> = {}) => ({ id: 'event-1', status: 'upcoming', startTime: Date.now() + 2 * 86400000, endTime: Date.now() + 2 * 86400000 + 3600000, ...fields } as AppEvent);
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-09T08:00:00Z')); prepare.mockReset(); prepare.mockResolvedValue({}); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('shows when a distant event becomes available and prevents a rejected download', () => {
  const selected = event();
  render(<OfflineAttendancePanel owner="mayor" eventId={selected.id} event={selected} data={data} />);
  expect(screen.getByRole('button', { name: 'Download offline roster' })).toBeDisabled();
  expect(screen.getByText(/Offline roster download opens/)).toHaveTextContent(/24 hours before/);
  fireEvent.click(screen.getByRole('button', { name: 'Download offline roster' }));
  expect(prepare).not.toHaveBeenCalled();
});

it('enables download when the preparation window opens while the dialog stays open', async () => {
  const selected = event({ startTime: Date.now() + 86400000 + 1000 });
  render(<OfflineAttendancePanel owner="mayor" eventId={selected.id} event={selected} data={data} />);
  expect(screen.getByRole('button', { name: 'Download offline roster' })).toBeDisabled();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByRole('button', { name: 'Download offline roster' })).toBeEnabled();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Download offline roster' })));
  expect(prepare).toHaveBeenCalledWith('mayor', selected.id);
});

it.each([
  [{ approvalStatus: 'pending' }, /needs approval/],
  [{ approvalStatus: 'rejected' }, /was rejected/],
  [{ cancellationStatus: 'cancelled' }, /is cancelled/],
  [{ endTime: Date.now() - 1000, status: 'done' }, /has ended/],
] as const)('explains why an unavailable event cannot be downloaded (%j)', (fields, reason) => {
  const selected = event({ ...fields } as Partial<AppEvent>);
  render(<OfflineAttendancePanel owner="mayor" eventId={selected.id} event={selected} data={data} />);
  expect(screen.getByRole('button', { name: 'Download offline roster' })).toBeDisabled();
  expect(screen.getByText(reason)).toBeInTheDocument();
});

it('clears a previous download failure when switching events', async () => {
  const selected = event({ startTime: Date.now() });
  prepare.mockRejectedValueOnce(new Error('Download failed'));
  const view = render(<OfflineAttendancePanel owner="mayor" eventId={selected.id} event={selected} data={data} />);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Download offline roster' })));
  expect(screen.getByRole('alert')).toHaveTextContent('Download failed');
  const next = event({ id: 'event-2' });
  view.rerender(<OfflineAttendancePanel owner="mayor" eventId={next.id} event={next} data={data} />);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
