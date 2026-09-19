import { supabase, requireConfiguration, verifyPassword } from './supabase';
import { UserProfile, UserStats, Application, AppEvent, SchoolNode, ExcuseApplication, CoreRole, CustomRole, PaymentInfo, SystemFreezeState, NodeFreezeState } from '../types';
import { DEFAULT_CORE_ROLES, setMockDataRef } from './accessControl';
import { findNodeById, findNodePath, flattenDirectory, getDirectorySubtree, isNodeInSubtree, profileMatchesDirectorySection } from './academicDirectory';
import { isEventRecipient } from './eventAudience';

type Student = UserProfile & { stats: UserStats; sanction_logs: any[] };
type Snapshot = {
  users: Record<string, { profile: UserProfile; stats: UserStats }>;
  applications: Record<string, Application>; excuse_applications: Record<string, ExcuseApplication>;
  events: Record<string, AppEvent>; attendance_logs: Record<string, Record<string, any>>;
  attendance: any[]; sanction_logs: Record<string, any[]>; school_structure: SchoolNode[];
  system_freeze: SystemFreezeState; frozen_nodes: Record<string, NodeFreezeState>;
  core_roles: Record<string, CoreRole>; custom_roles: Record<string, CustomRole>;
  payment_info: PaymentInfo; audit_logs: any[];
};
const empty = (): Snapshot => ({ users: {}, applications: {}, excuse_applications: {}, events: {}, attendance_logs: {}, attendance: [], sanction_logs: {}, school_structure: [], system_freeze: { isFrozen: false, reason: '' }, frozen_nodes: {}, core_roles: {}, custom_roles: {}, payment_info: { status: 'unpaid', amountDue: 0, currency: 'PHP', dueDate: 0, billingCycle: '', accountName: '', schoolId: '', reminders: [] }, audit_logs: [] });
let snapshot = empty();
let generation = 0;
let snapshotRequest = 0;
let currentUserId: string | null = null;
let lastSync: number | null = null;
let latency = 0;
const getDB = () => snapshot;
const getAssignmentNodeId = (p: UserProfile) => p.official_data?.assignment_node_id || p.school_data?.academic_assignment?.terminalGroupId;
const getAccountProfiles = (db: Snapshot) => Object.values(db.users).map(u => u.profile);
const profileBelongsToScope = (db: Snapshot, profile: UserProfile, id: string) => isNodeInSubtree(db.school_structure, id, getAssignmentNodeId(profile) || '');
export const subscribeData = (callback: () => void) => { window.addEventListener('rmc_data_update', callback); return () => window.removeEventListener('rmc_data_update', callback); };
export const notifyAuthChange = () => window.dispatchEvent(new Event('rmc_data_update'));
export function resetData(uid: string | null = null) { generation++; currentUserId = uid; snapshot = empty(); lastSync = null; notifyAuthChange(); }
function tree(rows: any[]): SchoolNode[] {
  const nodes = new Map<string, SchoolNode>(rows.map(r => [r.id, { ...r.data, id: r.id, children: [] }]));
  const roots: SchoolNode[] = [];
  rows.forEach(r => { const node = nodes.get(r.id)!; const parent = nodes.get(r.parent_id); (parent?.children || roots).push(node); });
  return roots;
}
export async function refreshData() {
  requireConfiguration();
  const requestGeneration = generation;
  const request = ++snapshotRequest;
  const started = performance.now();
  if (!currentUserId) {
    const { data, error } = await supabase.from('rmc_nodes').select('id,parent_id,data');
    if (error) throw error;
    if (requestGeneration !== generation || request !== snapshotRequest) return;
    snapshot.school_structure = tree(data || []); notifyAuthChange(); return;
  }
  const { data, error } = await supabase.rpc('rmc_snapshot');
  if (error) throw error;
  if (requestGeneration !== generation || request !== snapshotRequest) return;
  const next = empty();
  next.school_structure = tree(data.nodes);
  for (const [id, role] of Object.entries(data.roles)) (role as CoreRole).isBuiltIn ? next.core_roles[id] = role as CoreRole : next.custom_roles[id] = role as CustomRole;
  for (const s of data.sanctions) (next.sanction_logs[s.student_id] ||= []).push(s.data);
  for (const a of data.attendance) {
    next.attendance.push(a);
    const logs = next.attendance_logs[a.event_id] ||= {};
    const previous = logs[a.student_id];
    // Each window remains available in records; reports summarize the worst recorded status.
    const rank = { absent: 4, late: 3, present: 2, excused: 1 };
    if (!previous || rank[a.data.status as keyof typeof rank] > rank[previous.status as keyof typeof rank]) logs[a.student_id] = a.data;
  }
  for (const p of data.profiles as UserProfile[]) {
    const attendance = data.attendance.filter((a: any) => a.student_id === p.uid);
    const attended = new Set(attendance.filter((a: any) => ['present', 'late', 'excused'].includes(a.data.status)).map((a: any) => a.event_id)).size;
    const missed = new Set(attendance.filter((a: any) => a.data.status === 'absent').map((a: any) => a.event_id)).size;
    next.users[p.uid] = { profile: p, stats: { events_attended: attended, events_missed: missed, attendance_rate: attendance.length ? Math.round(attendance.filter((a: any) => a.data.status !== 'absent').length / attendance.length * 100) : 0, sanction_hours: Math.max(0, (next.sanction_logs[p.uid] || []).reduce((sum, s) => sum + Number(s.change), 0)) } };
  }
  for (const item of data.events) next.events[item.id] = item;
  for (const item of data.applications) next.applications[item.id] = item;
  for (const item of data.excuses) next.excuse_applications[item.id] = item;
  next.system_freeze = data.settings.system_freeze || next.system_freeze;
  next.frozen_nodes = data.settings.frozen_nodes || {};
  next.payment_info = data.settings.payment_info || next.payment_info;
  next.audit_logs = data.audit;
  snapshot = next; lastSync = Date.now(); latency = Math.round(performance.now() - started); notifyAuthChange();
}

async function rpc<T = any>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  requireConfiguration();
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
async function refreshAfterWrite() {
  try { await refreshData(); }
  catch { window.dispatchEvent(new CustomEvent('rmc_sync_error', { detail: 'Your change was saved, but the latest data could not be loaded. Reconnect or refresh the page.' })); }
}
async function command<T = any>(action: string, args: unknown[]): Promise<T> {
  const result = await rpc<T>('rmc_command', { action, args });
  await refreshAfterWrite();
  return result;
}
async function accounts(action: string, data: unknown) {
  const { data: result, error } = await supabase.functions.invoke('rmc-accounts', { body: { action, data } });
  if (error) {
    const body = await error.context?.json?.().catch(() => null);
    throw new Error(body?.error || error.message);
  }
  if (result.error) throw new Error(result.error);
  await refreshAfterWrite(); return result;
}
export const appAuth = {
  async signIn(identifier: string, password: string) {
    requireConfiguration();
    // Usernames are resolved on the server; no public email directory is exposed.
    const { data, error } = await supabase.functions.invoke('rmc-login', { body: { identifier: identifier.trim(), password } });
    if (error || data?.error) throw new Error(data?.error || 'Unable to sign in. Check your credentials.');
    const { error: sessionError } = await supabase.auth.setSession(data);
    if (sessionError) throw sessionError;
  },
  async signOut() { const { error } = await supabase.auth.signOut(); if (error) throw error; resetData(); },
  getCurrentUser: () => currentUserId ? snapshot.users[currentUserId] || null : null,
  async changePassword(currentPassword: string, password: string) {
    const email = snapshot.users[currentUserId || '']?.profile.email;
    if (!email) throw new Error('Sign in again to change your password.');
    const verified = await verifyPassword(email, currentPassword);
    if (!verified) throw new Error('Current password is incorrect.');
    const result = await supabase.auth.updateUser({ password }); if (result.error) throw result.error;
  },
};

export async function uploadDocument(file: File, kind: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in and verify your email before uploading documents.');
  if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Choose a JPG, PNG, WebP, or PDF file up to 5 MB.');
  const path = `${user.id}/${kind}/${crypto.randomUUID()}.${file.type.split('/')[1]}`;
  const { error } = await supabase.storage.from('rmc-documents').upload(path, file, { upsert: false });
  if (error) throw error;
  return `storage://${path}`;
}
export async function documentUrl(path: string) {
  if (!path.startsWith('storage://')) return path;
  const { data, error } = await supabase.storage.from('rmc-documents').createSignedUrl(path.slice(10), 300);
  if (error) throw error; return data.signedUrl;
}

export const appData = {
  updatePhoto: (uid: string, path: string) => command('updatePhoto', [uid, { path }]),
  getEvents: (): AppEvent[] => Object.values(snapshot.events),
  getCoreRoles: () => snapshot.core_roles,
  getCustomRoles: () => snapshot.custom_roles,
  getPaymentInfo: () => snapshot.payment_info,
  getSystemHealthMetrics: () => ({ dbStatus: lastSync ? 'operational' as const : 'degraded' as const, authStatus: currentUserId ? 'operational' as const : 'degraded' as const, geofenceStatus: 'degraded' as const, storageUsedBytes: 0, storageMaxBytes: 0, storageUsagePercent: 0, latencyMs: latency, activeSessions: currentUserId ? 1 : 0, totalUsersCount: Object.keys(snapshot.users).length, studentsCount: Object.values(snapshot.users).filter(u => u.profile.role === 'student').length, eventsCount: Object.keys(snapshot.events).length, attendanceLogsCount: snapshot.attendance.length, excuseAppsCount: Object.keys(snapshot.excuse_applications).length, auditLogsCount: snapshot.audit_logs.length, lastBackupTime: 0, healthScore: lastSync ? 100 : 0 }),
  getAttendanceRecords: (uid: string) => snapshot.attendance.filter(a => a.student_id === uid).map(a => ({ ...a.data, slot: a.slot, id: `${a.event_id}:${a.slot}`, event: snapshot.events[a.event_id] })),
  isMayorRegisteredForSection: (id?: string, name?: string) => Boolean(flattenDirectory(snapshot.school_structure).find(n => id ? n.id === id : n.name === name)?.['enrollmentKeyRequired']),
  getSectionSecurityKey: (_id?: string, _name?: string) => 'Stored securely; set a new key to rotate',
  createSchoolOfficial: (_actor: string, profile: Omit<UserProfile, 'uid' | 'photo_url'>, password: string) => accounts('create', { members: [{ profile, password }] }).then(r => r.ids[0]),
  deleteSchoolOfficial: (_actor: string, uid: string) => accounts('deactivate', { uid }),
  createUser: (profile: Omit<UserProfile, 'uid' | 'photo_url'>, password?: string) => accounts('create', { members: [{ profile, password }] }).then(r => r.ids[0]),
  createSectionMembers: (members: Array<{ profile: Omit<UserProfile, 'uid' | 'photo_url'>; makeMayor: boolean }>, _id: string, _name: string, password?: string) => accounts('create', { members: members.map(m => ({ profile: { ...m.profile, role: m.makeMayor ? 'mayor' : 'student' }, password })) }).then(r => r.ids),
  submitApplication: async (profile: UserProfile, password: string, enrollmentKey?: string) => {
    requireConfiguration();
    if (currentUserId && snapshot.applications[currentUserId]?.status === 'rejected') {
      await rpc('rmc_admission_update', { documents: {}, person: profile, enrollment_key: enrollmentKey || null });
      await refreshAfterWrite(); return { uid: currentUserId, needsEmailConfirmation: false };
    }
    if (currentUserId) throw new Error('You already have an account. Open your application status or sign out to register another student.');
    const { data, error } = await supabase.auth.signUp({ email: profile.email, password, options: { data: { profile, enrollment_key: enrollmentKey }, emailRedirectTo: window.location.origin } });
    if (error) throw error;
    if (!data.user || data.user.identities?.length === 0) throw new Error('Unable to create a new account with these details. If you already registered, confirm your email and sign in.');
    return { uid: data.user?.id, needsEmailConfirmation: !data.session };
  },
  verifyUserPassword: async (_uid: string, password: string) => {
    const email = snapshot.users[currentUserId || '']?.profile.email;
    if (!email) return false;
    return verifyPassword(email, password);
  },
  issueQr: () => rpc<{ token: string; expiresAt: number }>('rmc_issue_qr'),
  resolveQr: (token: string) => rpc<UserProfile>('rmc_resolve_qr', { token }),
  logAttendance: async (eventId: string, studentUid: string, _actor?: string, _name?: string, _time?: number, direction: 'in' | 'out' = 'in', verification?: { qrToken?: string; position?: unknown; manualReason?: string }) => {
    const result = await rpc('rmc_record_attendance', { event_id: eventId, student_id: studentUid, direction, qr_token: verification?.qrToken || null, scan_position: verification?.position || null, manual_reason: verification?.manualReason || null });
    await refreshAfterWrite(); return result;
  },
getApplications: () => Object.values(getDB().applications),
getExcuseApplications: () => Object.values(getDB().excuse_applications || {}),
getSchoolStructure: () => getDB().school_structure,
getSchoolNodePath: (nodeId: string) => findNodePath(getDB().school_structure, nodeId) || [],
getVisibleSchoolStructure: (actorUid: string) => {
    const db = getDB();
    const actor = db.users[actorUid]?.profile;
    if (!actor) return [];
    if (actor.role === 'admin') return db.school_structure;
    const scopeNodeId = getAssignmentNodeId(actor);
    return scopeNodeId ? getDirectorySubtree(db.school_structure, scopeNodeId) : [];
  },
getOfficialsForNode: (nodeId: string) => Object.values(getDB().users)
    .map(({ profile }) => profile)
    .filter((profile) => profile.role !== 'student' && profile.role !== 'admin' && getAssignmentNodeId(profile) === nodeId)
    .sort((first, second) => first.name.localeCompare(second.name)),
getAllAccountIdentities: () => getAccountProfiles(getDB()).map(({ email, username, student_id }) => ({
    email, username, student_id,
  })),
getOfficialAccounts: () => Object.values(getDB().users)
    .map(({ profile }) => profile)
    .filter(({ role, account_status }) => role !== 'student' && account_status === 'active')
    .sort((first, second) => first.name.localeCompare(second.name)),
getAccountAuditLogs: () => [...(getDB().audit_logs || [])]
    .sort((first, second) => second.timestamp - first.timestamp),
isNodeVisibleTo: (actorUid: string, nodeId: string) => {
    const db = getDB();
    const actor = db.users[actorUid]?.profile;
    if (!actor) return false;
    if (actor.role === 'admin') return Boolean(findNodeById(db.school_structure, nodeId));
    const scopeNodeId = getAssignmentNodeId(actor);
    return Boolean(scopeNodeId && isNodeInSubtree(db.school_structure, scopeNodeId, nodeId));
  },
getAllStudents: () => {
    const db = getDB();
    return Object.values(db.users)
      .filter(u => u.profile.account_status === 'active' && ['student', 'mayor', 'ssg'].includes(u.profile.role))
      .map(u => ({
        ...u.profile,
        stats: u.stats,
        sanction_logs: db.sanction_logs[u.profile.uid] || []
      }));
  },
getVisibleStudents: (actorUid: string) => {
    const db = getDB();
    const actor = db.users[actorUid]?.profile;
    const scopeNodeId = actor ? getAssignmentNodeId(actor) : undefined;
    return Object.values(db.users)
      .filter(({ profile }) => profile.account_status === 'active' && ['student', 'mayor', 'ssg'].includes(profile.role))
      .filter(({ profile }) => actor?.role === 'admin' || Boolean(scopeNodeId && profileBelongsToScope(db, profile, scopeNodeId)))
      .map(({ profile, stats }) => ({ ...profile, stats, sanction_logs: db.sanction_logs[profile.uid] || [] }));
  },
getVisibleApplications: (actorUid: string) => {
    const db = getDB();
    const actor = db.users[actorUid]?.profile;
    const scopeNodeId = actor ? getAssignmentNodeId(actor) : undefined;
    return Object.values(db.applications)
      .filter((application) => actor?.role === 'admin' || Boolean(scopeNodeId && profileBelongsToScope(db, application.form_data, scopeNodeId)));
  },
getVisibleExcuseApplications: (actorUid: string) => {
    const visibleIds = new Set(appData.getVisibleStudents(actorUid).map((student) => student.uid));
    return Object.values(getDB().excuse_applications || {}).filter((application) => visibleIds.has(application.student_uid));
  },
getVisibleEvents: (actorUid: string) => {
    const db = getDB();
    const actor = db.users[actorUid]?.profile;
    if (actor?.role === 'admin') return Object.values(db.events);
    const scopeNodeId = actor ? getAssignmentNodeId(actor) : undefined;
    if (!scopeNodeId) return [];
    const students = appData.getVisibleStudents(actorUid);
    return appData.getEvents().filter(event => event.created_by === actorUid || students.some(student => isEventRecipient(event, student, db.school_structure)) || isEventRecipient(event, actor!, db.school_structure));
  },
getRecipientEvents: (uid: string) => {
    const db = getDB();
    const profile = db.users[uid]?.profile;
    return profile ? appData.getEvents().filter(event => isEventRecipient(event, profile, db.school_structure)) : [];
  },
isEventRecipient: (event: AppEvent, profile: UserProfile) => isEventRecipient(event, profile, getDB().school_structure),
getAttendanceLogs: (eventId: string) => getDB().attendance_logs[eventId] || {},
getStudentsBySection: (sectionName: string, terminalGroupId?: string) => {
    const db = getDB();
    return Object.values(db.users)
      .filter(({ profile }) => terminalGroupId
        ? profileMatchesDirectorySection(profile, terminalGroupId, db.school_structure)
        : profile.school_data.section === sectionName)
      .filter(({ profile }) => profile.account_status === 'active' && ['student', 'mayor', 'ssg'].includes(profile.role))
      .map(u => ({ ...u.profile, stats: u.stats }));
  },
getUserProfile: (studentIdentifier: string) => {
    const db = getDB();
    return Object.values(db.users).find(u => 
      (u.profile.uid === studentIdentifier || u.profile.student_id === studentIdentifier) &&
      (u.profile.account_status === 'active' && ['student', 'mayor', 'ssg'].includes(u.profile.role)) &&
      (u.profile.account_status || 'active') === 'active'
    )?.profile;
  },
getUserDetail: (uid: string) => {
    const db = getDB();
    const u = db.users[uid];
    if (!u) return null;
    return {
      ...u,
      sanction_logs: db.sanction_logs[uid] || [],
      excuse_applications: Object.values(db.excuse_applications || {}).filter(a => a.student_uid === uid)
    };
  },
getSystemFreezeStatus: () => {
    return getDB().system_freeze || { isFrozen: false, reason: '' };
  },
getFrozenNodes: () => {
    return getDB().frozen_nodes || {};
  },
getNodeFreezeStatus: (nodeId: string) => {
    const frozenNodes = getDB().frozen_nodes || {};
    return frozenNodes[nodeId] || null;
  },
isNodeOrParentFrozen: (nodeId: string) => {
    const db = getDB();
    if (db.system_freeze?.isFrozen) return true;
    const frozenNodes = db.frozen_nodes || {};
    const path = findNodePath(db.school_structure, nodeId) || [];
    return path.some(node => frozenNodes[node.id]?.isFrozen);
  },
isUserScopeFrozen: (profile?: UserProfile | null) => {
    if (!profile) return false;
    const db = getDB();
    if (profile.role === 'admin') return false;
    if (db.system_freeze?.isFrozen) return true;
    const studentNode = profile.school_data?.academic_assignment?.terminalGroupId;
    if (studentNode && appData.isNodeOrParentFrozen(studentNode)) return true;
    const assignmentNodeId = profile.official_data?.assignment_node_id || studentNode;
    if (assignmentNodeId) {
      const path = findNodePath(db.school_structure, assignmentNodeId) || [];
      const frozenNodes = db.frozen_nodes || {};
      if (path.some(node => frozenNodes[node.id]?.isFrozen)) return true;
    }
    return false;
  },
  addSchoolNode: (...args: any[]) => command('addSchoolNode', args),
  updateSchoolNode: (...args: any[]) => command('updateSchoolNode', args),
  archiveSchoolNode: (...args: any[]) => command('archiveSchoolNode', args),
  deleteSchoolNode: (...args: any[]) => command('deleteSchoolNode', args),
  replaceSchoolStructure: (...args: any[]) => command('replaceSchoolStructure', args),
  setSectionSecurityKey: (...args: any[]) => command('setSectionSecurityKey', args),
  updateContactDetails: (...args: any[]) => command('updateContactDetails', args),
  approveApplication: (...args: any[]) => command('approveApplication', args),
  rejectApplication: (...args: any[]) => command('rejectApplication', args),
  assignSectionMayor: (...args: any[]) => command('assignSectionMayor', args),
  assignRole: (...args: any[]) => command('assignRole', args),
  assignAccountRole: (...args: any[]) => command('assignAccountRole', args),
  assignOfficialToNode: (...args: any[]) => command('assignOfficialToNode', args),
  createEvent: (...args: any[]) => command('createEvent', args),
  updateEvent: (...args: any[]) => command('updateEvent', args),
  archiveEvent: (...args: any[]) => command('archiveEvent', args),
  cancelEvent: (...args: any[]) => command('cancelEvent', args),
  deleteEvent: (...args: any[]) => command('deleteEvent', args),
  adjustSanctionHours: (...args: any[]) => command('adjustSanctionHours', args),
  resolveStudentSanctions: (...args: any[]) => command('resolveStudentSanctions', args),
  submitExcuseApplication: (...args: any[]) => command('submitExcuseApplication', args),
  reviewExcuseApplication: (...args: any[]) => command('reviewExcuseApplication', args),
  setSystemFreezeStatus: (...args: any[]) => command('setSystemFreezeStatus', args),
  setNodeFreezeStatus: (...args: any[]) => command('setNodeFreezeStatus', args),
  createCustomRole: (...args: any[]) => command('createCustomRole', args),
  updateCoreRole: (...args: any[]) => command('updateCoreRole', args),
  updateCustomRole: (...args: any[]) => command('updateCustomRole', args),
  deleteCustomRole: (...args: any[]) => command('deleteCustomRole', args),
  updatePaymentInfo: (...args: any[]) => command('updatePaymentInfo', args),
  sendPaymentReminderToOSAS: (...args: any[]) => command('sendPaymentReminderToOSAS', args),
};
setMockDataRef(appData);
