import { afterEach, expect, it } from 'vitest';
import { ensureMockReferenceData, getDB, mockAuth, mockData } from './mockBackend';

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

it('records attendance only once and returns the original receipt on duplicate scans', () => {
  ensureMockReferenceData();
  const first = mockData.logAttendance('mayor_demo_homeroom', 'mock_uid_student', 'mock_uid_mayor', 'Section Mayor');
  const second = mockData.logAttendance('mayor_demo_homeroom', 'mock_uid_student', 'mock_uid_mayor', 'Section Mayor');

  expect(first).toMatchObject({ status: 'present' });
  expect(second).toMatchObject({ time_in: first.time_in, status: first.status, already_recorded: true });
  expect(Object.keys(getDB().attendance_logs.mayor_demo_homeroom)).toHaveLength(1);
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
