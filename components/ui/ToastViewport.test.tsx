import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ToastViewport from './ToastViewport';
import { toast, toastStore } from '../../lib/toast';

afterEach(() => { cleanup(); toastStore.getSnapshot().forEach(item => toast.dismiss(item.id)); vi.useRealTimers(); });

it('retains dismissed popups for their exit animation and removes them afterwards', () => {
  vi.useFakeTimers(); render(<ToastViewport />);
  let id = 0;
  act(() => { id = toast.success('New notification'); });
  expect(screen.getByText('New notification').closest('.app-toast')).toHaveAttribute('data-state', 'open');
  act(() => { toast.dismiss(id); });
  expect(screen.getByText('New notification').closest('.app-toast')).toHaveAttribute('data-state', 'closing');
  act(() => { vi.advanceTimersByTime(200); });
  expect(screen.queryByText('New notification')).not.toBeInTheDocument();
});

it('animates the success popup again when an operation finishes', () => {
  render(<ToastViewport />);
  let progress!: ReturnType<typeof toast.start>;
  act(() => { progress = toast.start('Save changes'); });
  const before = screen.getByText('Save changes').closest('.app-toast');
  act(() => { progress.complete('Changes saved'); });
  const after = screen.getByText('Changes saved').closest('.app-toast');
  expect(after).not.toBe(before);
  expect(after).toHaveAttribute('data-state', 'open');
});
