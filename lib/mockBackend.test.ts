import { afterEach, expect, it } from 'vitest';
import { ensureMockReferenceData, getDB, mockAuth, mockData } from './mockBackend';
import { flattenDirectory } from './academicDirectory';

afterEach(() => localStorage.clear());

it('merges missing reference structure and events without replacing existing accounts or usernames', () => {
  const existingAccount = {
    password: 'user-chosen-secret',
    profile: {
      uid: 'custom-user-1',
      name: 'Existing Student',
      username: 'existing.student',
      email: 'existing.student@example.edu',
      role: 'student',
      student_id: 'RMC-CUSTOM-1',
      school_data: {
        type: 'High School',
        department: 'Senior High School',
        level: 'Grade 12',
        section: 'Newton',
        school_id: 'school_rmc',
      },
    },
    stats: {
      attendance_rate: 87,
      sanction_hours: 3,
      events_attended: 9,
      events_missed: 2,
    },
  };
  localStorage.setItem('rmc_regalia_db', JSON.stringify({
    applications: {},
    attendance_logs: {},
    events: {},
    excuse_applications: {},
    sanction_logs: {},
    school_structure: [],
    usernames: { 'existing.student': 'existing.student@example.edu' },
    users: { 'custom-user-1': existingAccount },
  }));

  const merged = ensureMockReferenceData();

  expect(merged.users['custom-user-1']).toEqual(existingAccount);
  expect(merged.usernames['existing.student']).toBe('existing.student@example.edu');
  expect(merged.school_structure).not.toHaveLength(0);
  expect(Object.keys(merged.events)).not.toHaveLength(0);
  expect(Object.values(merged.events).filter(event => event.status === 'active').length).toBeGreaterThanOrEqual(2);
  expect(Object.values(merged.events).filter(event => event.status === 'upcoming').length).toBeGreaterThanOrEqual(2);
  expect(Object.values(merged.events).filter(event => event.status === 'done').length).toBeGreaterThanOrEqual(2);

  const persisted = getDB();
  expect(persisted.users['custom-user-1']).toEqual(existingAccount);
  expect(persisted.usernames['existing.student']).toBe('existing.student@example.edu');
});

it('seeds current DepEd and CHED directory models for a clean installation', () => {
  const seeded = ensureMockReferenceData();
  const allNodes = flattenDirectory(seeded.school_structure);
  const jhs = allNodes.find((node) => node.metadata?.educationLevel === 'jhs');
  const strengthenedShs = allNodes.find((node) => node.metadata?.curriculumCode === 'strengthened_shs');
  const higherEducation = allNodes.find((node) => node.metadata?.educationLevel === 'higher_ed');

  expect(seeded.school_structure[0].type).toBe('campus');
  expect(jhs?.children?.map((node) => node.type)).toContain('grade_level');
  expect(flattenDirectory(jhs?.children || []).some((node) => ['track', 'strand'].includes(node.type))).toBe(false);
  expect(strengthenedShs?.children?.filter((node) => node.type === 'track').map((node) => node.name)).toEqual([
    'Academic',
    'Technical Professional (TechPro)',
  ]);
  expect(flattenDirectory(strengthenedShs?.children || []).some((node) => node.type === 'strand')).toBe(false);
  expect(flattenDirectory(higherEducation?.children || []).map((node) => node.type)).toEqual(expect.arrayContaining(['college', 'program', 'year_level', 'block']));
});

it('records attendance only once and returns the original receipt on duplicate scans', () => {
  ensureMockReferenceData();
  const first = mockData.logAttendance('mayor_demo_homeroom', 'mock_uid_student', 'mock_uid_mayor', 'Section Mayor');
  const second = mockData.logAttendance('mayor_demo_homeroom', 'mock_uid_student', 'mock_uid_mayor', 'Section Mayor');

  expect(first).toMatchObject({ status: 'present' });
  expect(second).toMatchObject({ time_in: first.time_in, status: first.status, already_recorded: true });
  expect(Object.keys(getDB().attendance_logs.mayor_demo_homeroom)).toHaveLength(1);
});

it('uses the scheduled attendance window late threshold instead of the legacy fifteen minutes', () => {
  ensureMockReferenceData();
  const startsAt = new Date('2026-08-14T08:00:00').getTime();
  mockData.createEvent({
    title: 'Thirty Minute Grace Event',
    description: 'Configured late threshold test.',
    created_by: 'SSG President',
    status: 'upcoming',
    startTime: startsAt,
    endTime: new Date('2026-08-14T10:00:00').getTime(),
    startDate: '2026-08-14',
    endDate: '2026-08-14',
    attendanceWindows: [{ id: 'window-1', timeIn: '08:00', timeOut: '10:00', lateAfterMinutes: 30 }],
    sanctionRules: {
      late: { value: 30, unit: 'minutes' },
      absent: { value: 1, unit: 'hours' },
    },
    recipientGroups: ['All Students'],
    geofenceEnabled: false,
    penaltyValue: 1,
    penaltyUnit: 'hours',
    participantsType: 'all',
    target: { all: true },
    location: { lat: 0, lng: 0, radius_meters: 0 },
    timestamp: startsAt,
  });
  const created = mockData.getEvents().find((event) => event.title === 'Thirty Minute Grace Event')!;

  const receipt = mockData.logAttendance(
    created.id,
    'mock_uid_student',
    'mock_uid_mayor',
    'Section Mayor',
    startsAt + 20 * 60 * 1000,
  );

  expect(receipt.status).toBe('present');
});

it('keeps a chosen enrollment password and activates the approved student account', async () => {
  const profile = {
    uid: 'pending-student-1',
    name: 'New Student',
    username: 'new.student',
    email: 'new.student@rmc.edu.ph',
    role: 'student' as const,
    student_id: 'RMC-NEW-1',
    photo_url: '',
    account_status: 'pending' as const,
    school_data: {
      type: 'High School' as const,
      department: 'Senior High School',
      level: 'Grade 12',
      section: 'Newton',
      school_id: 'school_rmc',
    },
  };

  mockData.submitApplication(profile, 'chosen-secret');
  expect(mockData.getApplications()[0].form_data.account_status).toBe('pending');

  mockData.approveApplication(profile.uid);
  const approved = getDB().users[profile.uid];
  expect(approved.profile.account_status).toBe('active');
  await expect(mockAuth.signIn(profile.username, 'chosen-secret')).resolves.toMatchObject({ profile: { uid: profile.uid } });
});

it('updates only student-editable contact and emergency details', () => {
  const uid = mockData.createUser({
    name: 'Contact Student',
    username: 'contact.student',
    email: 'contact.student@rmc.edu.ph',
    role: 'student',
    student_id: 'RMC-CONTACT-1',
    school_data: {
      type: 'High School',
      department: 'Senior High School',
      level: 'Grade 11',
      section: 'Pascal',
      school_id: 'school_rmc',
    },
  });

  mockData.updateContactDetails(uid, {
    phone: '09171234567',
    guardianName: 'Parent Name',
    guardianContact: '09179876543',
  });

  expect(getDB().users[uid].profile).toMatchObject({
    name: 'Contact Student',
    student_id: 'RMC-CONTACT-1',
    phone: '09171234567',
    guardian: { name: 'Parent Name', contact: '09179876543' },
  });
});

it('migrates a legacy academic directory without retaining old backups', () => {
  localStorage.setItem('rmc_regalia_db', JSON.stringify({
    schema_version: 1,
    directory_backups: [{ id: 'old-backup', createdAt: 1, label: 'Old directory', nodes: [] }],
    applications: {}, attendance_logs: {}, events: {}, excuse_applications: {}, sanction_logs: {}, usernames: {}, users: {},
    school_structure: [{ id: 'legacy-school', name: 'RMC', type: 'school', children: [{ id: 'jhs', name: 'Junior High School', type: 'department', children: [] }] }],
  }));

  const first = getDB();
  expect(first.schema_version).toBe(2);
  expect(first.school_structure[0].type).toBe('campus');
  expect(first).not.toHaveProperty('directory_backups');
});

it('updates, archives, and safely deletes customizable directory nodes', () => {
  ensureMockReferenceData();
  const root = mockData.getSchoolStructure()[0];
  mockData.addSchoolNode(root.id, { id: 'custom-unit', name: 'Custom Unit', type: 'custom', children: [] });

  expect(mockData.updateSchoolNode('custom-unit', { name: 'Renamed Unit' })).toBe(true);
  expect(mockData.archiveSchoolNode('custom-unit')).toBe(true);
  expect(mockData.getSchoolStructure()[0].children?.find((node) => node.id === 'custom-unit')).toMatchObject({
    name: 'Renamed Unit', metadata: { archived: true },
  });
  expect(mockData.deleteSchoolNode(root.id)).toBe(false);
  expect(mockData.deleteSchoolNode('custom-unit')).toBe(true);
});

it('assigns one mayor per academic terminal group without changing another section', () => {
  const createMember = (username: string, terminalGroupId: string, role: 'student' | 'mayor') => mockData.createUser({
    name: username,
    username,
    email: `${username}@rmc.edu.ph`,
    role,
    student_id: `RMC-${username}`,
    school_data: {
      type: 'High School',
      level: 'Grade 12',
      section: 'Shared Section Name',
      academic_assignment: {
        campusId: 'campus-rmc',
        nodePathIds: ['campus-rmc', terminalGroupId],
        terminalGroupId,
      },
    },
  });
  const previousMayor = createMember('previous.mayor', 'section-newton', 'mayor');
  const nextMayor = createMember('next.mayor', 'section-newton', 'student');
  const otherMayor = createMember('other.mayor', 'section-pascal', 'mayor');
  const staffMember = mockData.createUser({
    name: 'Section Staff', username: 'section.staff', email: 'section.staff@example.edu', role: 'ssg', student_id: 'SSG-SECTION',
    school_data: {
      type: 'High School', level: 'Grade 12', section: 'Shared Section Name',
      academic_assignment: { campusId: 'campus-rmc', nodePathIds: ['campus-rmc', 'section-newton'], terminalGroupId: 'section-newton' },
    },
  });

  expect(mockData.assignSectionMayor(nextMayor, 'section-newton', 'Shared Section Name')).toBe(true);

  const users = getDB().users;
  expect(users[previousMayor].profile.role).toBe('student');
  expect(users[nextMayor].profile.role).toBe('mayor');
  expect(users[otherMayor].profile.role).toBe('mayor');
  expect(mockData.getStudentsBySection('Shared Section Name', 'section-newton').map((profile) => profile.uid)).not.toContain(staffMember);
  expect(mockData.assignSectionMayor(staffMember, 'section-newton', 'Shared Section Name')).toBe(false);
  expect(users[staffMember].profile.role).toBe('ssg');
  expect(mockData.assignSectionMayor('missing-member', 'section-newton')).toBe(false);
});

it('rejects account identities already used by staff or pending applications', () => {
  ensureMockReferenceData();
  const pendingProfile = {
    uid: 'pending-duplicate-check',
    name: 'Pending Student',
    username: 'pending.identity',
    email: 'pending.identity@example.edu',
    role: 'student' as const,
    student_id: 'RMC-PENDING-ID',
    photo_url: '',
    school_data: { type: 'High School' as const, level: 'Grade 11', section: 'Pascal' },
  };
  mockData.submitApplication(pendingProfile, 'chosen-secret');

  expect(() => mockData.createUser({
    ...pendingProfile,
    username: 'ssg',
    email: 'new-email@example.edu',
    student_id: 'RMC-UNIQUE-ID',
  })).toThrow(/username.*already/i);
  expect(() => mockData.createUser({
    ...pendingProfile,
    username: 'new.identity',
    email: 'new-identity@example.edu',
  })).toThrow(/student id.*already/i);
  expect(mockData.getAllAccountIdentities()).toEqual(expect.arrayContaining([
    expect.objectContaining({ username: 'ssg' }),
    expect.objectContaining({ student_id: 'RMC-PENDING-ID' }),
  ]));
});

it('creates a reviewed section batch atomically and assigns its requested mayor', () => {
  ensureMockReferenceData();
  const school_data = {
    type: 'High School' as const,
    level: 'Grade 12',
    section: 'Newton',
    academic_assignment: {
      campusId: 'campus_rmc_main',
      nodePathIds: ['campus_rmc_main', 'sec_newton'],
      terminalGroupId: 'sec_newton',
    },
  };
  const profile = (name: string, suffix: string) => ({
    name,
    username: `batch.${suffix}`,
    email: `batch.${suffix}@example.edu`,
    role: 'student' as const,
    student_id: `RMC-BATCH-${suffix}`,
    school_data,
  });

  expect(() => mockData.createSectionMembers([
    { profile: profile('First Valid', 'one'), makeMayor: false },
    { profile: { ...profile('Duplicate Staff', 'two'), username: 'ssg' }, makeMayor: true },
  ], 'sec_newton', 'Newton')).toThrow(/username.*already/i);
  expect(Object.values(getDB().users).some(({ profile: saved }) => saved.username === 'batch.one')).toBe(false);

  const ids = mockData.createSectionMembers([
    { profile: profile('First Valid', 'one'), makeMayor: false },
    { profile: profile('Section Mayor', 'two'), makeMayor: true },
  ], 'sec_newton', 'Newton');
  expect(ids).toHaveLength(2);
  expect(getDB().users[ids[0]].profile.role).toBe('student');
  expect(getDB().users[ids[1]].profile.role).toBe('mayor');
});
