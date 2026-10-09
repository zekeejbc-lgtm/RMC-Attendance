export const ossaSections = [
  { id: 'activities', title: 'Event & ceremony approvals', description: 'Review submitted activities and their approval status.', permission: 'events.approve' },
  { id: 'requests', title: 'Student information requests', description: 'Approve or reject information changes and optional information deletions.', permission: 'ossa.manage_cases' },
  { id: 'sanctions', title: 'Student sanctions', description: 'Find students, review their records, and manage sanction balances.', permission: 'ossa.manage_cases' },
  { id: 'excuses', title: 'Excuse applications', description: 'Review absence letters, supporting documents, and medical excuses.', permission: 'ossa.manage_cases' },
  { id: 'analytics', title: 'Sanction analytics', description: 'View student clearance status and penalty hours by department.', permission: 'ossa.manage_cases' },
  { id: 'organizations', title: 'Organization approvals', description: 'Open organizations to review their events and sanction requests.', permission: 'ossa.manage_cases' },
] as const;
export type OSSASection = 'overview' | typeof ossaSections[number]['id'];
export const ossaSectionPath = (section: OSSASection) => `/ossa/dashboard${section === 'overview' ? '' : `/${section}`}`;
