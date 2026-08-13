import { afterEach, expect, it } from 'vitest';
import { ensureMockReferenceData, getDB } from './mockBackend';

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

  const persisted = getDB();
  expect(persisted.users['custom-user-1']).toEqual(existingAccount);
  expect(persisted.usernames['existing.student']).toBe('existing.student@example.edu');
});
