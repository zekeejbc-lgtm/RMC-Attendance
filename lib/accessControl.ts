import { UserRole } from '../types';

export type AppPermission =
  | 'system.manage_accounts'
  | 'system.view_audit'
  | 'directory.manage_structure'
  | 'directory.manage_members'
  | 'attendance.scan'
  | 'attendance.manage'
  | 'events.manage'
  | 'ossa.manage_cases';

const rolePermissions: Record<UserRole, readonly AppPermission[]> = {
  admin: [
    'system.manage_accounts', 'system.view_audit', 'directory.manage_structure',
    'directory.manage_members', 'attendance.scan', 'attendance.manage',
    'events.manage', 'ossa.manage_cases',
  ],
  ossa: [
    'directory.manage_structure', 'directory.manage_members', 'attendance.scan',
    'attendance.manage', 'events.manage', 'ossa.manage_cases',
  ],
  ossa_staff: ['attendance.scan', 'attendance.manage', 'ossa.manage_cases'],
  ssg: ['directory.manage_structure', 'directory.manage_members', 'attendance.scan', 'events.manage'],
  mayor: ['attendance.scan'],
  student: [],
};

export const hasPermission = (role: UserRole | undefined, permission: AppPermission) =>
  Boolean(role && rolePermissions[role]?.includes(permission));

export const roleLabels: Record<UserRole, string> = {
  admin: 'System Owner',
  ossa: 'OSSA Administrator',
  ossa_staff: 'OSSA Staff',
  ssg: 'SSG Officer',
  mayor: 'Mayor / Attendance Officer',
  student: 'Student',
};

export const schoolOfficialRoles: readonly UserRole[] = ['ossa', 'ossa_staff', 'ssg', 'mayor'];
