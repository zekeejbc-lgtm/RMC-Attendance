import { UserRole, AppPermission, CustomRole, CoreRole } from '../types';

export type { AppPermission };

export interface PermissionDefinition {
  id: AppPermission;
  name: string;
  category: 'System' | 'Directory' | 'Attendance' | 'Events' | 'OSSA';
  description: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  { id: 'system.manage_accounts', name: 'Manage User Accounts', category: 'System', description: 'Create, edit, and manage school official accounts' },
  { id: 'system.view_audit', name: 'View System Audit Logs', category: 'System', description: 'Access security and activity audit trails' },
  { id: 'system.freeze', name: 'Freeze System & Scopes', category: 'System', description: 'Freeze or unfreeze global system or specific departments/sections' },
  { id: 'system.health', name: 'Monitor System Health', category: 'System', description: 'View database metrics, storage usage, and component status' },
  { id: 'system.payment_reminders', name: 'Manage Payments & Reminders', category: 'System', description: 'Track payment status and send payment reminders to OSAS' },
  { id: 'system.manage_rbac', name: 'Manage RBAC & Roles', category: 'System', description: 'Create, edit, and customize access control permissions for roles' },
  { id: 'directory.manage_structure', name: 'Manage Directory Structure', category: 'Directory', description: 'Add, modify, or archive campus hierarchy units' },
  { id: 'directory.delete_structure', name: 'Delete Directory Structure & Units', category: 'Directory', description: 'Delete school units, departments, and academic hierarchy nodes' },
  { id: 'directory.manage_members', name: 'Manage Members & Students', category: 'Directory', description: 'Create and update student rosters and section assignments' },
  { id: 'directory.add_members_manually', name: 'Add Members Manually', category: 'Directory', description: 'Open the manual form to add an individual member to a class section' },
  { id: 'directory.change_member_designation', name: 'Change Member Designation', category: 'Directory', description: 'Assign or change a student designation, including mayor' },
  { id: 'directory.manage_student_sanctions', name: 'Manage Student Sanctions', category: 'Directory', description: 'Add, deduct, or clear student sanction hours' },
  { id: 'attendance.scan', name: 'Scan Attendance QR', category: 'Attendance', description: 'Use QR code scanner to take event attendance' },
  { id: 'attendance.manage', name: 'Manage Attendance Logs', category: 'Attendance', description: 'Review, modify, or export attendance records' },
  { id: 'events.manage', name: 'Create & Manage Events', category: 'Events', description: 'Schedule institutional events and set geofence rules' },
  { id: 'ossa.manage_cases', name: 'Manage Student Cases & Excuses', category: 'OSSA', description: 'Review excuse applications, adjust sanctions, and clear balances' },
];

export const DEFAULT_CORE_ROLES: Record<string, CoreRole> = {
  admin: {
    id: 'admin',
    name: 'System Owner / Super Admin',
    description: 'Full administrative access across all system nodes and controls',
    isPositionOnly: false,
    permissions: [
      'system.manage_accounts', 'system.view_audit', 'system.freeze', 'system.health',
      'system.payment_reminders', 'system.manage_rbac', 'directory.manage_structure',
      'directory.delete_structure', 'directory.manage_members', 'attendance.scan',
      'directory.add_members_manually', 'directory.change_member_designation', 'directory.manage_student_sanctions',
      'attendance.manage', 'events.manage', 'ossa.manage_cases',
    ],
    isBuiltIn: true,
  },
  ossa: {
    id: 'ossa',
    name: 'OSSA Administrator',
    description: 'Directs student discipline, excuses, and institutional sanction cases',
    isPositionOnly: false,
    permissions: [
      'directory.manage_structure', 'directory.manage_members', 'attendance.scan',
      'directory.add_members_manually', 'directory.change_member_designation', 'directory.manage_student_sanctions',
      'attendance.manage', 'events.manage', 'ossa.manage_cases', 'system.health',
    ],
    isBuiltIn: true,
  },
  ossa_staff: {
    id: 'ossa_staff',
    name: 'OSSA Staff',
    description: 'Scans attendance and reviews student excuse applications',
    isPositionOnly: false,
    permissions: ['attendance.scan', 'attendance.manage', 'ossa.manage_cases', 'directory.manage_student_sanctions'],
    isBuiltIn: true,
  },
  ssg: {
    id: 'ssg',
    name: 'SSG Officer',
    description: 'Manages events, geofencing, and directory section rosters',
    isPositionOnly: false,
    permissions: ['directory.manage_structure', 'directory.manage_members', 'directory.add_members_manually', 'directory.change_member_designation', 'attendance.scan', 'attendance.manage', 'events.manage'],
    isBuiltIn: true,
  },
  mayor: {
    id: 'mayor',
    name: 'Mayor / Attendance Officer',
    description: 'Scans class QR codes and records student attendance',
    isPositionOnly: false,
    permissions: ['attendance.scan'],
    isBuiltIn: true,
  },
  student: {
    id: 'student',
    name: 'Student',
    description: 'Personal attendance QR, event history, and excuse submission',
    isPositionOnly: false,
    permissions: [],
    isBuiltIn: true,
  },
};

let mockDataRef: any = null;
export const setMockDataRef = (ref: any) => {
  mockDataRef = ref;
};

export const hasPermission = (
  role: UserRole | string | undefined,
  permission: AppPermission,
  customRoles?: Record<string, CustomRole>,
  coreRoles?: Record<string, CoreRole>
): boolean => {
  if (!role) return false;

  const activeCore = coreRoles || (mockDataRef ? mockDataRef.getCoreRoles() : DEFAULT_CORE_ROLES);
  const activeCustom = customRoles || (mockDataRef ? mockDataRef.getCustomRoles() : {});

  if (activeCore && activeCore[role]) {
    const cRole = activeCore[role];
    if (cRole.isPositionOnly) return false;
    return (cRole.permissions || []).includes(permission);
  }

  if (activeCustom && activeCustom[role]) {
    const cRole = activeCustom[role];
    if (cRole.isPositionOnly) return false;
    return (cRole.permissions || []).includes(permission);
  }

  if (role === 'admin') return true;

  const defaultRole = DEFAULT_CORE_ROLES[role];
  if (defaultRole) {
    if (defaultRole.isPositionOnly) return false;
    return defaultRole.permissions.includes(permission);
  }

  return false;
};

export const roleLabels: Record<string, string> = {
  admin: 'System Owner / Super Admin',
  ossa: 'OSSA Administrator',
  ossa_staff: 'OSSA Staff',
  ssg: 'SSG Officer',
  mayor: 'Mayor / Attendance Officer',
  student: 'Student',
};

export const schoolOfficialRoles: readonly UserRole[] = ['ossa', 'ossa_staff', 'ssg', 'mayor'];

