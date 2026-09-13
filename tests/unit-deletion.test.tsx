import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import SSGPanel from '../views/SSGPanel';
import { ensureMockReferenceData } from '../lib/mockBackend';

let currentRole = 'admin';

vi.mock('../components/AuthContext', () => ({
  useAuth: () => ({
    profile: {
      uid: 'mock_uid_admin',
      name: 'Admin User',
      email: 'admin@rmc.edu.ph',
      username: 'admin',
      role: currentRole,
      account_status: 'active',
      school_data: { school_id: 'school_rmc' },
    },
    user: { uid: 'mock_uid_admin', email: 'admin@rmc.edu.ph' },
    loading: false,
    isMock: true,
  }),
}));

afterEach(cleanup);

describe('Unit Deletion & Security Confirmation', () => {
  it('hides delete unit buttons for roles without directory.delete_structure permission', () => {
    ensureMockReferenceData();
    currentRole = 'student';
    render(<SSGPanel />);
    expect(screen.queryByRole('button', { name: /delete unit/i })).toBeNull();
  });

  it('shows delete unit button for Admin and requires 4-step verification before executing deletion', async () => {
    ensureMockReferenceData();
    currentRole = 'admin';
    const user = userEvent.setup();
    render(<SSGPanel />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete unit/i });
    expect(deleteButtons.length).toBeGreaterThan(0);

    // Click first unit delete button
    await user.click(deleteButtons[0]);

    // Modal opens
    const dialog = screen.getByRole('dialog', { name: /delete unit/i });
    expect(dialog).toBeDefined();

    // Confirm button should be disabled initially
    const confirmBtn = screen.getByRole('button', { name: /confirm delete/i });
    expect(confirmBtn).toHaveProperty('disabled', true);

    // Fill in inputs step-by-step
    const nameInput = screen.getByLabelText(/1\. type first the name/i);
    const deleteTextInput = screen.getByLabelText(/2\. type delete/i);
    const passInput = screen.getByLabelText(/3\. password of the person/i);
    const confirmPassInput = screen.getByLabelText(/4\. confirm password/i);

    // Get expected target unit name from placeholder or label
    const placeholderName = nameInput.getAttribute('placeholder') || '';

    // Step 1: Type name
    await user.type(nameInput, placeholderName);
    expect(confirmBtn).toHaveProperty('disabled', true);

    // Step 2: Type DELETE
    await user.type(deleteTextInput, 'DELETE');
    expect(confirmBtn).toHaveProperty('disabled', true);

    // Step 3: Type Password
    await user.type(passInput, 'wrongpassword');
    // Step 4: Type Confirm Password
    await user.type(confirmPassInput, 'wrongpassword');

    // Confirm button is now enabled
    expect(confirmBtn).toHaveProperty('disabled', false);

    // Click confirm with wrong password -> shows error alert
    await user.click(confirmBtn);
    expect(await screen.findByRole('alert')).toBeDefined();
    expect(screen.getByText(/incorrect password/i)).toBeDefined();

    // Fix password to valid ('password123')
    await user.clear(passInput);
    await user.type(passInput, 'password123');
    await user.clear(confirmPassInput);
    await user.type(confirmPassInput, 'password123');

    // Submit valid form
    await user.click(confirmBtn);
  });
});
