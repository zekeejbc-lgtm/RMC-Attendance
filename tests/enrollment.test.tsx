import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../views/LandingPage';

const api = vi.hoisted(() => ({ validate: vi.fn(), submit: vi.fn(), upload: vi.fn(), remove: vi.fn() }));
vi.mock('../components/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, loading: false, revision: 0 }) }));
vi.mock('../components/ThemeContext', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }));
vi.mock('../components/ui/ThemeToggle', () => ({ default: () => null }));
vi.mock('../components/academic/AcademicPathPicker', () => ({
  AcademicPathPicker: ({ onChange }: any) => <button onClick={() => onChange([
    { id: 'campus', name: 'Campus', type: 'campus' },
    { id: 'section', name: 'Section A', type: 'section' },
  ])}>Choose section</button>,
}));
vi.mock('../lib/backend', () => ({
  appAuth: {}, refreshData: async () => undefined,
  appData: { getSchoolStructure: () => [{ id: 'campus' }], isMayorRegisteredForSection: () => false,
    validateEnrollment: api.validate, submitApplication: api.submit },
}));
vi.mock('../lib/googleDrive', async importOriginal => ({
  ...await importOriginal<typeof import('../lib/googleDrive')>(),
  createDriveImage: api.upload, deleteDriveImage: api.remove,
  fileAsDataUrl: vi.fn(async () => 'data:image/png;base64,dGVzdA=='),
}));

beforeEach(() => {
  vi.resetAllMocks();
  api.validate.mockResolvedValue(undefined);
  api.submit.mockResolvedValue({ uid: 'new', needsEmailConfirmation: true });
  api.upload.mockResolvedValue({ id: 'photo123', url: 'https://lh3.googleusercontent.com/d/photo123=w4000' });
  vi.stubGlobal('Image', class {
    naturalWidth = 100; naturalHeight = 100; onload?: () => void;
    set src(_value: string) { queueMicrotask(() => this.onload?.()); }
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function fill(id: string, value: string) {
  fireEvent.change(document.getElementById(`landing-register-${id}`)!, { target: { value } });
}
async function reachPhoto() {
  render(<MemoryRouter><LandingPage defaultOpenRegister /></MemoryRouter>);
  fill('name', 'Test Student'); fill('email', 'student@example.test');
  fill('password', 'StrongPassword123!'); fill('confirm-password', 'StrongPassword123!');
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByLabelText('Official Student ID #');
  fill('student-id', '2026-12345');
  fireEvent.click(screen.getByRole('button', { name: 'Choose section' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByLabelText('Guardian Name');
  fill('guardian-name', 'Test Guardian'); fill('guardian-phone', '09123456789');
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByLabelText('Choose profile picture');
  fireEvent.change(document.getElementById('enrollment-photo')!, {
    target: { files: [new File(['photo'], 'photo.png', { type: 'image/png' })] },
  });
  await screen.findByText('photo.png');
}

it('submits a photo URL accepted by the enrollment validator and shows email confirmation', async () => {
  await reachPhoto();
  fireEvent.click(screen.getByRole('button', { name: 'Register' }));
  await screen.findByText('Registration Submitted!');
  const profile = api.submit.mock.calls[0][0];
  expect(profile.photo_url).toBe('https://drive.google.com/thumbnail?id=photo123&sz=w1600');
  expect(api.validate).toHaveBeenLastCalledWith(profile, '', 4);
  expect(screen.getByRole('button', { name: 'Sign In After Confirmation' })).toBeInTheDocument();
});

it('retains the uploaded photo after a failed signup and reuses it on retry', async () => {
  api.submit.mockRejectedValueOnce({ message: 'Connection interrupted' });
  await reachPhoto();
  fireEvent.click(screen.getByRole('button', { name: 'Register' }));
  await screen.findByText('Connection interrupted');
  expect(api.remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Register' }));
  await screen.findByText('Registration Submitted!');
  expect(api.upload).toHaveBeenCalledTimes(1);
  expect(api.submit).toHaveBeenCalledTimes(2);
  expect(api.submit.mock.calls[1][0].photo_url).toBe(api.submit.mock.calls[0][0].photo_url);
});

it('rejects invalid details before uploading and allows a corrected retry', async () => {
  await reachPhoto();
  api.validate.mockRejectedValueOnce(new Error('Enrollment is frozen for this section.'));
  fireEvent.click(screen.getByRole('button', { name: 'Register' }));
  await screen.findByText('Enrollment is frozen for this section.');
  expect(api.upload).not.toHaveBeenCalled();
  expect(api.submit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Register' }));
  await screen.findByText('Registration Submitted!');
});

it('keeps the selected photo when an invalid replacement is chosen', async () => {
  await reachPhoto();
  fireEvent.change(document.getElementById('enrollment-photo')!, {
    target: { files: [new File(['bad'], 'bad.txt', { type: 'text/plain' })] },
  });
  await screen.findByText('Choose a JPG, PNG, or WebP image.');
  expect(screen.getByText('photo.png')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Register' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Register' }));
  await screen.findByText('Registration Submitted!');
});
