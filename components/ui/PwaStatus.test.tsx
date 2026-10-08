import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PwaStatus from './PwaStatus';

const worker = vi.hoisted(() => ({ needRefresh: false, update: vi.fn(), dismiss: vi.fn() }));
vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: () => ({ needRefresh: [worker.needRefresh, worker.dismiss], updateServiceWorker: worker.update }) }));
beforeEach(() => { worker.needRefresh = false; worker.update.mockReset(); worker.dismiss.mockReset(); vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('explains offline restrictions and clears them after reconnecting', () => {
  render(<PwaStatus />);
  expect(screen.queryByLabelText('App status')).toBeNull();
  act(() => window.dispatchEvent(new Event('offline')));
  expect(screen.getByRole('status')).toHaveTextContent('Reconnect');
  expect(screen.getByRole('status')).toHaveTextContent('record attendance');
  act(() => window.dispatchEvent(new Event('online')));
  expect(screen.queryByLabelText('App status')).toBeNull();
});

it('only applies an update after an explicit click', async () => {
  worker.needRefresh = true;
  render(<PwaStatus />);
  expect(worker.update).not.toHaveBeenCalled();
  expect(screen.getByRole('status')).toHaveTextContent('Save your work');
  fireEvent.click(screen.getByRole('button', { name: 'Later' }));
  expect(worker.dismiss).toHaveBeenCalledWith(false);
  expect(worker.update).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Reload to update' }));
  await waitFor(() => expect(worker.update).toHaveBeenCalledWith(true));
});

it('offers browser installation and waits for the user to accept it', async () => {
  render(<PwaStatus />);
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) });
  act(() => window.dispatchEvent(event));
  expect(event.defaultPrevented).toBe(true);
  expect(prompt).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Install IARS' }));
  await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.queryByLabelText('App status')).toBeNull());
});
