import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { mockData } from '../lib/mockBackend';
import { hasPermission } from '../lib/accessControl';
import { AdminRBACRoleView } from '../components/admin/AdminRBACRoleView';

describe('Admin RBAC Role Editing and Permission Enforcement', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('allows admins to view and edit built-in core roles', () => {
    render(<AdminRBACRoleView actorName="System Admin" />);

    // Built-in core system roles section should exist
    expect(screen.getByText(/Core System Roles \(Built-in\)/i)).toBeInTheDocument();

    // Check that core system roles have edit buttons
    const editRoleButtons = screen.getAllByRole('button', { name: /Edit role/i });
    expect(editRoleButtons.length).toBeGreaterThanOrEqual(6);

    // Edit OSSA Administrator role
    const ossaEditButton = screen.getByRole('button', { name: /Edit role OSSA Administrator/i });
    fireEvent.click(ossaEditButton);

    // Modal should open
    expect(screen.getByText(/Edit System Core Role/i)).toBeInTheDocument();

    // Submit changes
    const submitButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitButton);
  });

  it('updates permissions for core system roles dynamically in hasPermission', () => {
    const initialCore = mockData.getCoreRoles();
    expect(initialCore.ssg.permissions).toContain('events.manage');
    expect(hasPermission('ssg', 'events.manage')).toBe(true);

    // Admin edits SSG role to remove events.manage
    mockData.updateCoreRole('ssg', {
      ...initialCore.ssg,
      permissions: initialCore.ssg.permissions.filter(p => p !== 'events.manage')
    });

    // Permission check should now return false for ssg
    expect(hasPermission('ssg', 'events.manage')).toBe(false);
  });
});