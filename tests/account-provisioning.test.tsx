import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NodeOfficerManager } from '../components/academic/NodeOfficerManager';
import { AdminAccountView } from '../components/admin/AdminAccountView';
import { appData } from '../lib/backend';
import { SchoolNode, UserProfile } from '../types';

vi.mock('../lib/backend', () => ({ appData: {
  getCoreRoles: () => ({}), getCustomRoles: () => ({}), getOfficialsForNode: () => [],
  getOfficialAccounts: () => [], getSchoolStructure: vi.fn(), getAccountAccess: vi.fn(async () => ({})),
  createSchoolOfficial: vi.fn(async () => 'new-id'), createUser: vi.fn(async () => 'new-id'),
} }));
const campus: SchoolNode = { id: 'campus', name: 'Campus', type: 'education_unit', children: [
  { id: 'department', name: 'Department', type: 'department' },
  { id: 'archived', name: 'Archived', type: 'department', metadata: { archived: true } },
] };
const actor = { uid: 'admin', role: 'admin' } as UserProfile;
const fill = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const chooseUnit = (label: RegExp, option: string) => {
  fireEvent.click(screen.getByRole('button', { name: label }));
  fireEvent.click(screen.getByRole('option', { name: option }));
};
function fillOfficer(index: number) {
  fill('Full name', `Officer ${index}`); fill('Email', `officer${index}@example.test`);
  fill('Username', `officer${index}`); fill('Official ID', `ID${index}`); fill('Temporary password', 'Example-password-123!');
}
beforeEach(() => { vi.clearAllMocks(); vi.mocked(appData.getSchoolStructure).mockReturnValue([campus]); });
afterEach(cleanup);

describe('Multiple managed accounts', () => {
  it.each(['admin', 'ossa', 'ossa_staff', 'ssg'])('creates two separate %s accounts from the officer dialog', async role => {
    render(<NodeOfficerManager actor={actor} node={campus} canManage onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Assign officer' }));
    fill('Role', role);
    fireEvent.click(screen.getByLabelText('Create another account with this role and unit'));
    for (const index of [1, 2]) {
      fillOfficer(index);
      fireEvent.click(screen.getByRole('button', { name: role === 'admin' ? 'Create account' : 'Create and assign' }));
      await waitFor(() => expect(appData.createSchoolOfficial).toHaveBeenCalledTimes(index));
      await waitFor(() => expect(screen.getByLabelText('Full name')).toHaveValue(''));
      expect(screen.getByLabelText('Role')).toHaveValue(role);
      const profile = vi.mocked(appData.createSchoolOfficial).mock.calls[index - 1][1];
      expect(profile).toMatchObject({ role, name: `Officer ${index}`, email: `officer${index}@example.test` });
      if (role === 'admin') expect(profile.official_data).toBeUndefined();
      else expect(profile.official_data?.assignment_node_id).toBe('campus');
    }
  });

  it('filters assignments and shows creation errors inside the admin dialog', async () => {
    vi.mocked(appData.createUser).mockRejectedValueOnce(new Error('Email already exists.'));
    render(<AdminAccountView />);
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.queryByRole('button', { name: /^Department/ })).toBeNull();
    fill('Access role', 'ssg');
    chooseUnit(/^Education Unit/i, 'Campus');
    fireEvent.click(screen.getByRole('button', { name: /^Department/ }));
    expect(screen.queryByRole('option', { name: 'Archived' })).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: 'Department' }));
    fill('Full name', 'SSG One'); fill('Email', 'ssg@example.test'); fill('Username', 'ssg-one');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email already exists.');
    expect(screen.getByLabelText('Full name')).toHaveValue('SSG One');
  });

  it('keeps the selected role and unit when creating another managed account', async () => {
    render(<AdminAccountView />);
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    fill('Access role', 'ossa_staff'); chooseUnit(/^Education Unit/i, 'Campus');
    fireEvent.click(screen.getByLabelText('Create another account with this role and unit'));
    for (const index of [1, 2]) {
      fill('Full name', `Staff ${index}`); fill('Email', `staff${index}@example.test`); fill('Username', `staff${index}`);
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
      await waitFor(() => expect(appData.createUser).toHaveBeenCalledTimes(index));
      await waitFor(() => expect(screen.getByLabelText('Full name')).toHaveValue(''));
      expect(screen.getByLabelText('Access role')).toHaveValue('ossa_staff');
      expect(screen.getByLabelText('Selected academic path')).toHaveTextContent('Campus');
      expect(vi.mocked(appData.createUser).mock.calls[index - 1][0].official_data?.assignment_node_id).toBe('campus');
      expect(screen.getByRole('status')).toHaveTextContent('Copy the initial password');
    }
  });

  it('does not offer account creation without account-management permission', () => {
    render(<NodeOfficerManager actor={{ ...actor, role: 'ssg' }} node={campus} canManage onChanged={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Assign officer' })).toBeNull();
  });
});
