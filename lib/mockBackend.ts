
import { TEST_ACCOUNTS } from './seed';
import { UserProfile, UserStats, Application, AppEvent, SchoolNode, ExcuseApplication, UserRole } from '../types';
import { schoolOfficialRoles } from './accessControl';
import { findNodeById, findNodePath, flattenDirectory, getDirectorySubtree, isNodeInSubtree, migrateAcademicDirectory } from './academicDirectory';

const STORAGE_KEY = 'rmc_regalia_db';

interface MockDB {
  users: Record<string, { profile: UserProfile; stats: UserStats; password: string }>;
  usernames: Record<string, string>;
  applications: Record<string, Application>;
  excuse_applications: Record<string, ExcuseApplication>;
  events: Record<string, AppEvent>;
  attendance_logs: Record<string, Record<string, any>>;
  sanction_logs: Record<string, any[]>;
  school_structure: SchoolNode[];
  schema_version?: number;
  application_credentials?: Record<string, string>;
  deleted_seed_accounts?: string[];
  audit_logs?: Array<{
    id: string;
    action: 'account.created' | 'account.deleted';
    actor_uid: string;
    actor_name: string;
    target_uid: string;
    target_name: string;
    target_role: UserRole;
    timestamp: number;
  }>;
}

type NewUserProfile = Omit<UserProfile, 'uid' | 'photo_url'>;

const accountEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeNewUserProfile = (profile: NewUserProfile): NewUserProfile => ({
  ...profile,
  name: profile.name.trim(),
  username: profile.username.trim(),
  email: profile.email.trim().toLowerCase(),
  student_id: profile.student_id.trim(),
  phone: profile.phone?.trim() || undefined,
  guardian: profile.guardian ? {
    name: profile.guardian.name.trim(),
    contact: profile.guardian.contact.trim(),
    ...(profile.guardian.email?.trim() ? { email: profile.guardian.email.trim().toLowerCase() } : {}),
  } : undefined,
});

const getAccountProfiles = (db: MockDB): UserProfile[] => [
  ...Object.values(db.users).map(({ profile }) => profile),
  ...Object.values(db.applications).map(({ form_data }) => form_data),
];

const assertNewUserProfile = (db: MockDB, profile: NewUserProfile, additional: NewUserProfile[] = []) => {
  if (!profile.name) throw new Error('Name is required.');
  if (!profile.email || !accountEmailPattern.test(profile.email)) throw new Error('A valid email address is required.');
  if (!profile.username) throw new Error('Username is required.');
  if (!profile.student_id) throw new Error('Student ID is required.');
  if (profile.guardian?.email && !accountEmailPattern.test(profile.guardian.email)) throw new Error('Guardian email must be valid.');

  const candidates = [...getAccountProfiles(db), ...additional];
  const uniqueFields: Array<{ field: 'email' | 'username' | 'student_id'; label: string }> = [
    { field: 'email', label: 'Email' },
    { field: 'username', label: 'Username' },
    { field: 'student_id', label: 'Student ID' },
  ];
  uniqueFields.forEach(({ field, label }) => {
    const normalizedValue = profile[field].trim().toLowerCase();
    if (candidates.some((candidate) => candidate[field].trim().toLowerCase() === normalizedValue)) {
      throw new Error(`${label} already exists.`);
    }
  });
};

const addUserToDB = (db: MockDB, profile: NewUserProfile, password: string, suffix = '') => {
  const uid = `u_${Date.now()}_${suffix}${Math.random().toString(36).slice(2, 11)}`;
  db.usernames[profile.username.toLowerCase()] = profile.email.toLowerCase();
  db.users[uid] = {
    password,
    profile: {
      ...profile,
      account_status: profile.account_status || 'active',
      uid,
      photo_url: `https://i.pravatar.cc/150?u=${uid}`,
    } as UserProfile,
    stats: { attendance_rate: 100, sanction_hours: 0, events_attended: 0, events_missed: 0 },
  };
  return uid;
};

const getAssignmentNodeId = (profile: UserProfile) =>
  profile.official_data?.assignment_node_id
  || (profile.role === 'mayor' ? profile.school_data.academic_assignment?.terminalGroupId : undefined);

const canRoleBeAssignedToNode = (role: UserRole, node: SchoolNode) => {
  if (role === 'ossa' || role === 'ossa_staff') return ['campus', 'school'].includes(node.type);
  if (role === 'ssg') return ['education_unit', 'department', 'college'].includes(node.type);
  if (role === 'mayor') return ['section', 'block'].includes(node.type);
  return false;
};

const applyAssignment = (profile: UserProfile | NewUserProfile, path: SchoolNode[]) => {
  const node = path.at(-1);
  if (!node) throw new Error('Select a valid directory unit.');
  if (!canRoleBeAssignedToNode(profile.role, node)) throw new Error(`${profile.role} cannot be assigned to this type of directory unit.`);
  profile.official_data = {
    ...(profile.official_data || { body: profile.role === 'ssg' || profile.role === 'mayor' ? 'SSG' : 'OSSA' }),
    scope: node.name,
    assignment_node_id: node.id,
    assignment_node_path_ids: path.map((item) => item.id),
  };
};

const migrateOfficerAssignments = (db: MockDB) => {
  if (!db.school_structure.length) return false;
  const flattened = flattenDirectory(db.school_structure);
  let changed = false;
  Object.values(db.users).forEach(({ profile }) => {
    if (profile.role === 'admin' || profile.role === 'student' || getAssignmentNodeId(profile)) return;
    const node = profile.role === 'ossa' || profile.role === 'ossa_staff'
      ? flattened.find((item) => ['campus', 'school'].includes(item.type))
      : profile.role === 'ssg'
        ? flattened.find((item) => ['education_unit', 'department', 'college'].includes(item.type))
        : flattened.find((item) => ['section', 'block'].includes(item.type) && item.name === profile.school_data.section)
          || flattened.find((item) => ['section', 'block'].includes(item.type));
    const path = node ? findNodePath(db.school_structure, node.id) : undefined;
    if (path) {
      applyAssignment(profile, path);
      changed = true;
    }
  });
  return changed;
};

const profileBelongsToScope = (db: MockDB, profile: UserProfile, scopeNodeId: string) => {
  const assignment = profile.school_data.academic_assignment;
  if (assignment?.nodePathIds.includes(scopeNodeId)) return true;
  if (assignment?.terminalGroupId && isNodeInSubtree(db.school_structure, scopeNodeId, assignment.terminalGroupId)) return true;
  const scopedNodes = flattenDirectory(getDirectorySubtree(db.school_structure, scopeNodeId));
  return scopedNodes.some((node) =>
    ['section', 'block'].includes(node.type) && node.name === profile.school_data.section,
  );
};

export const getDB = (): MockDB => {
  let db: MockDB;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    db = data ? JSON.parse(data) : { 
      users: {}, 
      usernames: {}, 
      applications: {}, 
      excuse_applications: {},
      events: {}, 
      attendance_logs: {},
      sanction_logs: {},
      school_structure: []
    };
  } catch (e) {
    db = { users: {}, usernames: {}, applications: {}, excuse_applications: {}, events: {}, attendance_logs: {}, sanction_logs: {}, school_structure: [] };
  }

  if (!db.application_credentials) db.application_credentials = {};
  if (!db.deleted_seed_accounts) db.deleted_seed_accounts = [];
  if (!db.audit_logs) db.audit_logs = [];

  let updated = false;
  if ('directory_backups' in db) {
    delete (db as MockDB & { directory_backups?: unknown }).directory_backups;
    updated = true;
  }
  if ((db.schema_version || 1) < 2) {
    const migration = migrateAcademicDirectory(db.school_structure || []);
    if (migration.changed) db.school_structure = migration.nodes;
    db.schema_version = 2;
    updated = true;
  }

  // Ensure all TEST_ACCOUNTS exist in db.users & db.usernames
  TEST_ACCOUNTS.forEach(acc => {
    const uid = `mock_uid_${acc.user}`;
    if (db.deleted_seed_accounts?.includes(uid)) return;
    if (!db.users[uid]) {
      updated = true;
      db.usernames[acc.user.toLowerCase()] = acc.email.toLowerCase();
      db.users[uid] = {
        password: 'password123',
        profile: {
          uid,
          name: acc.name,
          username: acc.user.toLowerCase(),
          email: acc.email,
          role: acc.role as any,
          account_status: 'active',
          student_id: acc.user === 'student' ? '2024-00123' : (acc.user === 'ossa' ? 'OSSA-DIR-01' : `ID-${Math.floor(Math.random() * 9000) + 1000}`),
          photo_url: acc.user === 'ossa' ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' : `https://i.pravatar.cc/150?u=${uid}`,
          official_data: acc.role === 'ssg'
            ? { body: 'SSG', position: 'Officer', scope: 'Institution' }
            : acc.role === 'ossa'
              ? { body: 'OSSA', position: 'Director', scope: 'Institution' }
              : acc.role === 'admin'
                ? { body: 'Administration', position: 'System Administrator', scope: 'All' }
                : undefined,
          school_data: {
            type: acc.user === 'student' ? 'High School' : 'College',
            department: acc.user === 'student' ? "Senior High School" : 'Office of Student Services and Affairs',
            level: acc.user === 'student' ? "Grade 12" : "Administration",
            section: acc.user === 'student' ? "Newton" : "OSSA Main",
            school_id: 'school_rmc'
          }
        },
        stats: {
          attendance_rate: acc.role === 'student' ? 88 : 100,
          sanction_hours: acc.role === 'student' ? 12 : 0,
          events_attended: 15,
          events_missed: 2
        }
      };
    }
  });

  // Ensure extra students exist for OSSA roster review
  const extraStudents = [
    { uid: 'mock_uid_juan', name: 'Juan Dela Cruz', student_id: '2024-00101', email: 'juan.delacruz@rmc.edu.ph', dept: 'Senior High School', level: 'Grade 11', section: 'Pascal', sanction_hours: 8, attendance_rate: 91 },
    { uid: 'mock_uid_clara', name: 'Clara Santos', student_id: '2024-00102', email: 'clara.santos@rmc.edu.ph', dept: 'Senior High School', level: 'Grade 12', section: 'Einstein', sanction_hours: 0, attendance_rate: 99 },
    { uid: 'mock_uid_marco', name: 'Marco Antonio Polo', student_id: '2024-00103', email: 'marco.polo@rmc.edu.ph', dept: 'College of Arts and Sciences', level: '2nd Year', section: 'CS-2A', sanction_hours: 18, attendance_rate: 76 },
    { uid: 'mock_uid_bea', name: 'Beatriz Alonzo', student_id: '2024-00104', email: 'beatriz.alonzo@rmc.edu.ph', dept: 'Senior High School', level: 'Grade 12', section: 'Newton', sanction_hours: 4, attendance_rate: 94 },
    { uid: 'mock_uid_andres', name: 'Andres Bonifacio', student_id: '2024-00105', email: 'andres.bonifacio@rmc.edu.ph', dept: 'Junior High School', level: 'Grade 10', section: 'Kamagong', sanction_hours: 0, attendance_rate: 100 }
  ];

  extraStudents.forEach(s => {
    if (!db.users[s.uid]) {
      updated = true;
      db.users[s.uid] = {
        password: 'password123',
        profile: {
          uid: s.uid,
          name: s.name,
          username: s.name.toLowerCase().replace(/\s+/g, '.'),
          email: s.email,
          role: 'student',
          account_status: 'active',
          student_id: s.student_id,
          photo_url: `https://i.pravatar.cc/150?u=${s.uid}`,
          school_data: {
            type: s.dept.includes('College') ? 'College' : 'High School',
            department: s.dept,
            level: s.level,
            section: s.section,
            school_id: 'school_rmc'
          }
        },
        stats: {
          attendance_rate: s.attendance_rate,
          sanction_hours: s.sanction_hours,
          events_attended: 12,
          events_missed: s.sanction_hours > 0 ? 3 : 0
        }
      };
      if (!db.sanction_logs[s.uid]) {
        db.sanction_logs[s.uid] = s.sanction_hours > 0 ? [
          { timestamp: Date.now() - 86400000 * 5, change: s.sanction_hours, reason: "Unexcused Absence from Flag Raising Ceremony", performed_by: "OSSA System" }
        ] : [];
      }
    }
  });

  if (migrateOfficerAssignments(db)) updated = true;

  if (!db.sanction_logs['mock_uid_student'] || db.sanction_logs['mock_uid_student'].length === 0) {
    updated = true;
    db.sanction_logs['mock_uid_student'] = [
      { timestamp: Date.now() - 86400000 * 10, change: 12, reason: "Unexcused Absence from University Convocation", performed_by: "OSSA Director" }
    ];
  }

  if (Object.keys(db.excuse_applications || {}).length === 0) {
    updated = true;
    db.excuse_applications = {
      'exc_01': {
        id: 'exc_01',
        student_uid: 'mock_uid_student',
        student_name: 'Pedro Penduko',
        student_id: '2024-00123',
        department: 'Senior High School',
        section: 'Newton',
        event_title: 'University Convocation 2024',
        event_date: '2024-03-15',
        category: 'medical',
        reason: 'Severe flu with high fever. Medical certificate attached.',
        proof_url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80',
        status: 'pending',
        submitted_at: Date.now() - 86400000 * 2
      },
      'exc_02': {
        id: 'exc_02',
        student_uid: 'mock_uid_juan',
        student_name: 'Juan Dela Cruz',
        student_id: '2024-00101',
        department: 'Senior High School',
        section: 'Pascal',
        event_title: 'Intramural Games Opening',
        event_date: '2024-03-20',
        category: 'institutional',
        reason: 'Represented school in Regional Academic Quiz Bee competition.',
        proof_url: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=600&auto=format&fit=crop&q=80',
        status: 'pending',
        submitted_at: Date.now() - 86400000 * 1
      }
    };
  }

  if (updated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  return db;
};

export const saveDB = (db: MockDB) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

export const isMockMode = () => true; 

export const notifyAuthChange = () => {
  window.dispatchEvent(new Event('rmc_auth_update'));
};

export const mockAuth = {
  signIn: async (identifier: string, pass: string) => {
    const db = getDB();
    const cleanId = identifier.toLowerCase().trim();
    const email = db.usernames[cleanId] || cleanId;
    
    let userEntry = Object.values(db.users).find(u => 
      u.profile.username.toLowerCase() === cleanId || 
      u.profile.email.toLowerCase() === email.toLowerCase()
    );

    // Fallback: If not found, check TEST_ACCOUNTS
    if (!userEntry) {
      const testAcc = TEST_ACCOUNTS.find(a => 
        a.user.toLowerCase() === cleanId || 
        a.email.toLowerCase() === cleanId
      );
      if (testAcc && !db.deleted_seed_accounts?.includes(`mock_uid_${testAcc.user}`)) {
        mockSeed();
        const refreshedDb = getDB();
        userEntry = Object.values(refreshedDb.users).find(u => 
          u.profile.username.toLowerCase() === cleanId || 
          u.profile.email.toLowerCase() === email.toLowerCase()
        );
      }
    }
    
    if (userEntry) {
      if ((userEntry.profile.account_status || 'active') !== 'active') {
        throw new Error('This account is not active. Contact an authorized school official.');
      }
      if (userEntry.password === pass) {
        localStorage.setItem('rmc_mock_session', userEntry.profile.uid);
        notifyAuthChange();
        return userEntry;
      } else {
        throw new Error(`Incorrect password for '${identifier}'. Test accounts use 'password123'.`);
      }
    }
    throw new Error(`User '${identifier}' not found. Try 'ossa', 'admin', 'ssg', 'mayor', or 'student'.`);
  },
  signOut: () => {
    localStorage.removeItem('rmc_mock_session');
    notifyAuthChange();
  },
  getCurrentUser: () => {
    const uid = localStorage.getItem('rmc_mock_session');
    if (!uid) return null;
    return getDB().users[uid] || null;
  }
};

const createReferenceSchoolStructure = (): SchoolNode[] => {
  const defaultSchool: SchoolNode = {
    id: 'school_rmc',
    name: 'Rizal Memorial Colleges',
    type: 'campus',
    logo_url: 'https://placehold.co/400x400/0E1B42/D4AF37?text=RMC',
    metadata: { schemaVersion: 2, selectableForEvents: true },
    children: [
      {
        id: 'dept_jhs',
        name: 'Junior High School',
        type: 'education_unit',
        metadata: { educationLevel: 'jhs', curriculumCode: 'matatag', schemaVersion: 2, selectableForEvents: true },
        children: [
          { id: 'lvl_g7', name: 'Grade 7', type: 'grade_level', children: [{ id: 'sec_narra', name: 'Narra', type: 'section' }] },
          { id: 'lvl_g8', name: 'Grade 8', type: 'grade_level', children: [] },
          { id: 'lvl_g9', name: 'Grade 9', type: 'grade_level', children: [] },
          { id: 'lvl_g10', name: 'Grade 10', type: 'grade_level', children: [{ id: 'sec_kamagong', name: 'Kamagong', type: 'section' }] }
        ]
      },
      {
        id: 'dept_strengthened_shs',
        name: 'Strengthened Senior High School',
        type: 'education_unit',
        metadata: { educationLevel: 'shs', curriculumCode: 'strengthened_shs', schemaVersion: 2, selectableForEvents: true },
        children: [
          {
            id: 'track_strengthened_academic',
            name: 'Academic',
            type: 'track',
            children: [
              { id: 'lvl_strengthened_academic_g11', name: 'Grade 11', type: 'grade_level', children: [{ id: 'sec_pascal', name: 'Pascal', type: 'section' }] },
              { id: 'lvl_strengthened_academic_g12', name: 'Grade 12', type: 'grade_level', children: [] },
            ]
          },
          {
            id: 'track_strengthened_techpro',
            name: 'Technical Professional (TechPro)',
            type: 'track',
            children: [
              { id: 'lvl_strengthened_techpro_g11', name: 'Grade 11', type: 'grade_level', children: [] },
              { id: 'lvl_strengthened_techpro_g12', name: 'Grade 12', type: 'grade_level', children: [] },
            ]
          },
        ]
      },
      {
        id: 'dept_legacy_shs',
        name: 'Legacy Senior High School',
        type: 'education_unit',
        metadata: { educationLevel: 'shs', curriculumCode: 'legacy_shs', schemaVersion: 2, selectableForEvents: true },
        children: [
          {
            id: 'track_legacy_academic',
            name: 'Academic',
            type: 'track',
            children: [
              {
                id: 'strand_stem',
                name: 'STEM',
                type: 'strand',
                children: [{ id: 'lvl_shs_g12', name: 'Grade 12', type: 'grade_level', children: [
                  { id: 'sec_newton', name: 'Newton', type: 'section' },
                  { id: 'sec_einstein', name: 'Einstein', type: 'section' },
                ] }]
              },
              { id: 'strand_abm', name: 'ABM', type: 'strand', children: [{ id: 'lvl_shs_g12_abm', name: 'Grade 12', type: 'grade_level', children: [{ id: 'sec_luca', name: 'Luca Pacioli', type: 'section' }] }] },
            ]
          },
          { id: 'track_legacy_tvl', name: 'TVL', type: 'track', children: [] },
          { id: 'track_legacy_arts', name: 'Arts and Design', type: 'track', children: [] },
          { id: 'track_legacy_sports', name: 'Sports', type: 'track', children: [] },
        ]
      },
      {
        id: 'dept_higher_education',
        name: 'Higher Education',
        type: 'education_unit',
        metadata: { educationLevel: 'higher_ed', schemaVersion: 2, selectableForEvents: true },
        children: [{
          id: 'col_cas',
          name: 'College of Arts and Sciences',
          type: 'college',
          children: [{
            id: 'prog_bscs',
            name: 'BS Computer Science',
            type: 'program',
            children: [
              { id: 'lvl_bscs_1', name: '1st Year', type: 'year_level', children: [{ id: 'sec_cs1a', name: 'CS-1A', type: 'block' }] },
              { id: 'lvl_bscs_2', name: '2nd Year', type: 'year_level', children: [{ id: 'sec_cs2a', name: 'CS-2A', type: 'block' }] },
            ]
          }]
        }]
      }
    ]
  };
  return [defaultSchool];
};

const createReferenceEvent = (): AppEvent => ({
  id: 'e1',
  title: "General Assembly",
  description: "Institutional objective details for the annual assembly focusing on second semester directives and school-wide improvements.",
  status: 'active',
  created_by: 'system',
  startTime: Date.now(),
  endTime: Date.now() + 3600000,
  penaltyValue: 5,
  penaltyUnit: 'hours',
  participantsType: 'all',
  target: { all: true },
  location: { lat: 7.0736, lng: 125.6126, radius_meters: 5000 },
  timestamp: Date.now()
} as AppEvent);

const createMayorHubDemoEvents = (now = Date.now()): Record<string, AppEvent> => {
  const base = {
    created_by: 'demo_system',
    penaltyValue: 2,
    penaltyUnit: 'hours' as const,
    participantsType: 'all' as const,
    target: { all: true },
    location: { lat: 7.0736, lng: 125.6126, radius_meters: 200 },
    timestamp: now,
  };
  return {
    mayor_demo_homeroom: {
      ...base,
      id: 'mayor_demo_homeroom',
      title: 'Morning Homeroom Check-in',
      description: 'Demo ongoing event for testing a Present attendance record during the first fifteen minutes.',
      status: 'active',
      startTime: now - 5 * 60 * 1000,
      endTime: now + 55 * 60 * 1000,
    },
    mayor_demo_assembly: {
      ...base,
      id: 'mayor_demo_assembly',
      title: 'Institutional Assembly',
      description: 'Demo ongoing event that began earlier, allowing the Late attendance state to be tested.',
      status: 'active',
      startTime: now - 45 * 60 * 1000,
      endTime: now + 75 * 60 * 1000,
      location: { lat: 7.0739, lng: 125.6128, radius_meters: 250 },
    },
    mayor_demo_club_fair: {
      ...base,
      id: 'mayor_demo_club_fair',
      title: 'Student Club Fair',
      description: 'A scheduled demo event opening tomorrow at the activity center.',
      status: 'upcoming',
      startTime: now + 24 * 60 * 60 * 1000,
      endTime: now + 27 * 60 * 60 * 1000,
      location: { lat: 7.0741, lng: 125.6131, radius_meters: 180 },
    },
    mayor_demo_flag_raising: {
      ...base,
      id: 'mayor_demo_flag_raising',
      title: 'Monday Flag Ceremony',
      description: 'A scheduled school-wide ceremony for testing the upcoming event view.',
      status: 'upcoming',
      startTime: now + 3 * 24 * 60 * 60 * 1000,
      endTime: now + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
    },
    mayor_demo_foundation: {
      ...base,
      id: 'mayor_demo_foundation',
      title: 'Foundation Day Opening',
      description: 'Completed demo event retained for attendance history and archive testing.',
      status: 'done',
      startTime: now - 7 * 24 * 60 * 60 * 1000,
      endTime: now - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
    },
    mayor_demo_orientation: {
      ...base,
      id: 'mayor_demo_orientation',
      title: 'Student Leadership Orientation',
      description: 'A second archived event for validating the Mayor Hub history list.',
      status: 'done',
      startTime: now - 14 * 24 * 60 * 60 * 1000,
      endTime: now - 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000,
    },
  };
};

export const ensureMockReferenceData = () => {
  const db = getDB();
  let updated = false;

  if (db.school_structure.length === 0) {
    db.school_structure = createReferenceSchoolStructure();
    updated = true;
  }
  if (Object.keys(db.events).length === 0) {
    db.events.e1 = createReferenceEvent();
    updated = true;
  }
  Object.entries(createMayorHubDemoEvents()).forEach(([id, event]) => {
    if (!db.events[id]) {
      db.events[id] = event;
      updated = true;
    }
  });

  if (migrateOfficerAssignments(db)) updated = true;

  if (updated) saveDB(db);
  return db;
};

export const mockSeed = () => {
  const db = getDB();
  db.users = {};
  db.usernames = {};
  db.school_structure = createReferenceSchoolStructure();

  TEST_ACCOUNTS.forEach(acc => {
    const uid = `mock_uid_${acc.user}`;
    db.usernames[acc.user.toLowerCase()] = acc.email.toLowerCase();
    db.users[uid] = {
      password: 'password123',
      profile: {
        uid,
        name: acc.name,
        username: acc.user.toLowerCase(),
        email: acc.email,
        role: acc.role as any,
        account_status: 'active',
        student_id: acc.user === 'student' ? '2024-00123' : (acc.user === 'ossa' ? 'OSSA-DIR-01' : `ID-${Math.floor(Math.random() * 9000) + 1000}`),
        photo_url: acc.user === 'ossa' ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' : `https://i.pravatar.cc/150?u=${uid}`,
        official_data: acc.role === 'ssg'
          ? { body: 'SSG', position: 'Officer', scope: 'Institution' }
          : acc.role === 'ossa'
            ? { body: 'OSSA', position: 'Director', scope: 'Institution' }
            : acc.role === 'admin'
              ? { body: 'Administration', position: 'System Administrator', scope: 'All' }
              : undefined,
        school_data: {
          type: acc.user === 'student' ? 'High School' : 'College',
          department: acc.user === 'student' ? "Senior High School" : 'Office of Student Services and Affairs',
          level: acc.user === 'student' ? "Grade 12" : "Administration",
          section: acc.user === 'student' ? "Newton" : "OSSA Main",
          school_id: 'school_rmc'
        }
      },
      stats: {
        attendance_rate: acc.role === 'student' ? 88 : 100,
        sanction_hours: acc.role === 'student' ? 12 : 0,
        events_attended: 15,
        events_missed: 2
      }
    };
  });

  // Seed additional sample students for OSSA roster review
  const extraStudents = [
    {
      uid: 'mock_uid_juan',
      name: 'Juan Dela Cruz',
      student_id: '2024-00101',
      email: 'juan.delacruz@rmc.edu.ph',
      dept: 'Senior High School',
      level: 'Grade 11',
      section: 'Pascal',
      sanction_hours: 8,
      attendance_rate: 91
    },
    {
      uid: 'mock_uid_clara',
      name: 'Clara Santos',
      student_id: '2024-00102',
      email: 'clara.santos@rmc.edu.ph',
      dept: 'Senior High School',
      level: 'Grade 12',
      section: 'Einstein',
      sanction_hours: 0,
      attendance_rate: 99
    },
    {
      uid: 'mock_uid_marco',
      name: 'Marco Antonio Polo',
      student_id: '2024-00103',
      email: 'marco.polo@rmc.edu.ph',
      dept: 'College of Arts and Sciences',
      level: '2nd Year',
      section: 'CS-2A',
      sanction_hours: 18,
      attendance_rate: 76
    },
    {
      uid: 'mock_uid_bea',
      name: 'Beatriz Alonzo',
      student_id: '2024-00104',
      email: 'beatriz.alonzo@rmc.edu.ph',
      dept: 'Senior High School',
      level: 'Grade 12',
      section: 'Newton',
      sanction_hours: 4,
      attendance_rate: 94
    },
    {
      uid: 'mock_uid_andres',
      name: 'Andres Bonifacio',
      student_id: '2024-00105',
      email: 'andres.bonifacio@rmc.edu.ph',
      dept: 'Junior High School',
      level: 'Grade 10',
      section: 'Kamagong',
      sanction_hours: 0,
      attendance_rate: 100
    }
  ];

  extraStudents.forEach(s => {
    db.users[s.uid] = {
      password: 'password123',
      profile: {
        uid: s.uid,
        name: s.name,
        username: s.name.toLowerCase().replace(/\s+/g, '.'),
        email: s.email,
        role: 'student',
        account_status: 'active',
        student_id: s.student_id,
        photo_url: `https://i.pravatar.cc/150?u=${s.uid}`,
        school_data: {
          type: s.dept.includes('College') ? 'College' : 'High School',
          department: s.dept,
          level: s.level,
          section: s.section,
          school_id: 'school_rmc'
        }
      },
      stats: {
        attendance_rate: s.attendance_rate,
        sanction_hours: s.sanction_hours,
        events_attended: 12,
        events_missed: s.sanction_hours > 0 ? 3 : 0
      }
    };
    db.sanction_logs[s.uid] = s.sanction_hours > 0 ? [
      { timestamp: Date.now() - 86400000 * 5, change: s.sanction_hours, reason: "Unexcused Absence from Flag Raising Ceremony" }
    ] : [];
  });

  // Seed sample excuse applications for OSSA
  db.excuse_applications = {
    'exc_01': {
      id: 'exc_01',
      student_uid: 'mock_uid_student',
      student_name: 'Pedro Penduko',
      student_id: '2024-00123',
      department: 'Senior High School',
      section: 'Grade 12 - Newton',
      event_title: 'Weekly Flag Raising Ceremony',
      category: 'medical',
      reason: 'Suffered high fever and flu. Medical certificate attached from Davao Doctors Hospital.',
      proof_url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500&auto=format&fit=crop&q=80',
      submission_date: Date.now() - 86400000,
      status: 'pending'
    },
    'exc_02': {
      id: 'exc_02',
      student_uid: 'mock_uid_marco',
      student_name: 'Marco Antonio Polo',
      student_id: '2024-00103',
      department: 'College of Arts and Sciences',
      section: 'CS-2A',
      event_title: 'Institutional Convocation Assembly',
      category: 'institutional',
      reason: 'Represented school in Regional Collegiate Cyber Security Quiz Bowl.',
      proof_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500&auto=format&fit=crop&q=80',
      submission_date: Date.now() - 86400000 * 2,
      status: 'pending'
    }
  };
  
  db.events = { e1: createReferenceEvent(), ...createMayorHubDemoEvents() };
  
  saveDB(db);
};

export const mockData = {
  getEvents: () => {
    const db = ensureMockReferenceData();
    const now = Date.now();
    let changed = false;
    Object.values(db.events).forEach((event) => {
      if (event.status === 'active' && event.endTime <= now) { event.status = 'done'; changed = true; }
    });
    if (changed) saveDB(db);
    return Object.values(db.events);
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
    .filter(({ role }) => role !== 'student')
    .sort((first, second) => first.name.localeCompare(second.name)),
  getAccountAuditLogs: () => [...(getDB().audit_logs || [])]
    .sort((first, second) => second.timestamp - first.timestamp),
  createSchoolOfficial: (
    actorUid: string,
    profile: NewUserProfile,
    password: string,
  ) => {
    const db = getDB();
    const actor = db.users[actorUid]?.profile;
    if (actor?.role !== 'admin') throw new Error('Only the System Owner can create school-official accounts.');
    if (!schoolOfficialRoles.includes(profile.role)) throw new Error('That role cannot be created from School Accounts.');
    if (password.length < 8) throw new Error('Temporary password must contain at least 8 characters.');

    const normalized = normalizeNewUserProfile(profile);
    const assignmentNodeId = normalized.official_data?.assignment_node_id;
    const assignmentPath = assignmentNodeId ? findNodePath(db.school_structure, assignmentNodeId) : undefined;
    if (!assignmentPath) throw new Error('Assign the account to a valid school unit.');
    applyAssignment(normalized, assignmentPath);
    assertNewUserProfile(db, normalized);
    const uid = addUserToDB(db, normalized, password);
    db.audit_logs?.push({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      action: 'account.created', actor_uid: actor.uid, actor_name: actor.name,
      target_uid: uid, target_name: normalized.name, target_role: normalized.role,
      timestamp: Date.now(),
    });
    saveDB(db);
    notifyAuthChange();
    return uid;
  },
  deleteSchoolOfficial: (actorUid: string, targetUid: string) => {
    const db = getDB();
    const actor = db.users[actorUid]?.profile;
    const target = db.users[targetUid]?.profile;
    if (actor?.role !== 'admin') throw new Error('Only the System Owner can delete school-official accounts.');
    if (!target) throw new Error('Account not found.');
    if (actorUid === targetUid || target.role === 'admin') throw new Error('System Owner accounts cannot be deleted here.');
    if (target.role === 'student') throw new Error('Student accounts must be managed from the school directory.');

    delete db.usernames[target.username.toLowerCase()];
    delete db.users[targetUid];
    if (targetUid.startsWith('mock_uid_') && !db.deleted_seed_accounts?.includes(targetUid)) {
      db.deleted_seed_accounts?.push(targetUid);
    }
    db.audit_logs?.push({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      action: 'account.deleted', actor_uid: actor.uid, actor_name: actor.name,
      target_uid: targetUid, target_name: target.name, target_role: target.role,
      timestamp: Date.now(),
    });
    saveDB(db);
    notifyAuthChange();
    return true;
  },
  assignOfficialToNode: (actorUid: string, targetUid: string, nodeId: string) => {
    const db = getDB();
    const actor = db.users[actorUid]?.profile;
    const target = db.users[targetUid]?.profile;
    const path = findNodePath(db.school_structure, nodeId);
    if (actor?.role !== 'admin') throw new Error('Only the System Owner can assign officer scopes.');
    if (!target || target.role === 'admin' || target.role === 'student') throw new Error('Select a school-official account.');
    if (!path) throw new Error('Directory unit not found.');
    applyAssignment(target, path);
    saveDB(db);
    notifyAuthChange();
    return true;
  },
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
      .filter(u => u.profile.role === 'student' || u.profile.role === 'mayor')
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
      .filter(({ profile }) => profile.role === 'student' || profile.role === 'mayor')
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
    const visibleIds = new Set(mockData.getVisibleStudents(actorUid).map((student) => student.uid));
    return Object.values(getDB().excuse_applications || {}).filter((application) => visibleIds.has(application.student_uid));
  },
  getVisibleEvents: (actorUid: string) => {
    const db = getDB();
    const actor = db.users[actorUid]?.profile;
    if (actor?.role === 'admin') return Object.values(db.events);
    const scopeNodeId = actor ? getAssignmentNodeId(actor) : undefined;
    if (!scopeNodeId) return [];
    return Object.values(db.events).filter((event) => {
      if (!event.audienceTarget || event.audienceTarget.mode === 'all') return true;
      if (event.audienceTarget.mode === 'specific_people') return event.audienceTarget.specificUserIds?.includes(actorUid);
      const eventNodeId = event.audienceTarget.nodeId;
      return Boolean(eventNodeId && (
        isNodeInSubtree(db.school_structure, scopeNodeId, eventNodeId)
        || isNodeInSubtree(db.school_structure, eventNodeId, scopeNodeId)
      ));
    });
  },
  getStudentsBySection: (sectionName: string, terminalGroupId?: string) => {
    const db = getDB();
    return Object.values(db.users)
      .filter(({ profile }) => terminalGroupId
        ? profile.school_data.academic_assignment?.terminalGroupId === terminalGroupId
          || (!profile.school_data.academic_assignment && profile.school_data.section === sectionName)
        : profile.school_data.section === sectionName)
      .filter(({ profile }) => profile.role === 'student' || profile.role === 'mayor')
      .map(u => ({ ...u.profile, stats: u.stats }));
  },
  getUserProfile: (studentIdentifier: string) => {
    const db = getDB();
    return Object.values(db.users).find(u => 
      (u.profile.uid === studentIdentifier || u.profile.student_id === studentIdentifier) &&
      (u.profile.role === 'student' || u.profile.role === 'mayor') &&
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
  createUser: (profile: NewUserProfile, password = 'password123') => {
    const db = getDB();
    const normalized = normalizeNewUserProfile(profile);
    assertNewUserProfile(db, normalized);
    const uid = addUserToDB(db, normalized, password);
    saveDB(db);
    return uid;
  },
  createSectionMembers: (
    members: Array<{ profile: NewUserProfile; makeMayor: boolean }>,
    terminalGroupId: string,
    sectionName: string,
    password = 'password123',
  ) => {
    const db = getDB();
    if (members.filter(({ makeMayor }) => makeMayor).length > 1) {
      throw new Error('Only one mayor can be assigned to a section.');
    }
    const normalizedMembers = members.map(({ profile, makeMayor }) => ({
      profile: normalizeNewUserProfile(profile), makeMayor,
    }));
    const validated: NewUserProfile[] = [];
    normalizedMembers.forEach(({ profile }) => {
      const assignment = profile.school_data.academic_assignment;
      const belongsToSection = assignment
        ? assignment.terminalGroupId === terminalGroupId
        : profile.school_data.section === sectionName;
      if (!belongsToSection) throw new Error('A member does not belong to the selected section.');
      assertNewUserProfile(db, profile, validated);
      validated.push(profile);
    });

    const created = normalizedMembers.map(({ profile }, index) => addUserToDB(db, profile, password, `${index}_`));
    const mayorIndex = normalizedMembers.findIndex(({ makeMayor }) => makeMayor);
    if (mayorIndex >= 0) {
      const belongsToGroup = (profile: UserProfile) => profile.school_data.academic_assignment
        ? profile.school_data.academic_assignment.terminalGroupId === terminalGroupId
        : profile.school_data.section === sectionName;
      Object.values(db.users).forEach(({ profile }) => {
        if (belongsToGroup(profile) && profile.role === 'mayor') profile.role = 'student';
      });
      db.users[created[mayorIndex]].profile.role = 'mayor';
    }
    saveDB(db);
    notifyAuthChange();
    return created;
  },
  addSchoolNode: (parentId: string | null, node: SchoolNode) => {
    const db = getDB();
    if (!parentId) {
      db.school_structure.push(node);
    } else {
      const findAndAdd = (nodes: SchoolNode[]): boolean => {
        for (const n of nodes) {
          if (n.id === parentId) {
            if (!n.children) n.children = [];
            n.children.push(node);
            return true;
          }
          if (n.children && findAndAdd(n.children)) return true;
        }
        return false;
      };
      findAndAdd(db.school_structure);
    }
    saveDB(db);
  },
  assignRole: (uid: string, role: any) => {
    const db = getDB();
    if (db.users[uid]) {
      db.users[uid].profile.role = role;
      saveDB(db);
      notifyAuthChange();
    }
  },
  assignSectionMayor: (uid: string, terminalGroupId: string, sectionName?: string) => {
    const db = getDB();
    const selected = db.users[uid]?.profile;
    if (!selected) return false;
    if (selected.role !== 'student' && selected.role !== 'mayor') return false;

    const belongsToGroup = (profile: UserProfile) => profile.school_data.academic_assignment
      ? profile.school_data.academic_assignment.terminalGroupId === terminalGroupId
      : Boolean(sectionName && profile.school_data.section === sectionName);
    if (!belongsToGroup(selected)) return false;

    Object.values(db.users).forEach(({ profile }) => {
      if (belongsToGroup(profile) && profile.role === 'mayor') profile.role = 'student';
    });
    selected.role = 'mayor';
    saveDB(db);
    notifyAuthChange();
    return true;
  },
  updateContactDetails: (uid: string, changes: { phone?: string; guardianName?: string; guardianContact?: string }) => {
    const db = getDB();
    if (!db.users[uid]) return false;
    if ('phone' in changes) db.users[uid].profile.phone = changes.phone?.trim() || undefined;
    if ('guardianName' in changes || 'guardianContact' in changes) {
      const guardian = { ...(db.users[uid].profile.guardian || { name: '', contact: '' }) };
      if ('guardianName' in changes) guardian.name = changes.guardianName?.trim() || '';
      if ('guardianContact' in changes) guardian.contact = changes.guardianContact?.trim() || '';
      db.users[uid].profile.guardian = guardian.name || guardian.contact ? guardian : undefined;
    }
    saveDB(db);
    notifyAuthChange();
    return true;
  },
  adjustSanctionHours: (uid: string, hoursDelta: number, reason: string = "Manual Adjustment") => {
    const db = getDB();
    if (db.users[uid]) {
      const current = db.users[uid].stats.sanction_hours || 0;
      const newTotal = Math.max(0, current + hoursDelta);
      db.users[uid].stats.sanction_hours = newTotal;
      if (!db.sanction_logs[uid]) db.sanction_logs[uid] = [];
      db.sanction_logs[uid].unshift({
        timestamp: Date.now(),
        change: hoursDelta,
        new_total: newTotal,
        reason,
        performed_by: 'OSSA Office'
      });
      saveDB(db);
      notifyAuthChange();
      return true;
    }
    return false;
  },
  resolveStudentSanctions: (uid: string, notes: string = "Cleared and Resolved by OSSA") => {
    const db = getDB();
    if (db.users[uid]) {
      const previousHours = db.users[uid].stats.sanction_hours || 0;
      db.users[uid].stats.sanction_hours = 0;
      if (!db.sanction_logs[uid]) db.sanction_logs[uid] = [];
      db.sanction_logs[uid].unshift({
        timestamp: Date.now(),
        change: -previousHours,
        new_total: 0,
        reason: notes,
        performed_by: 'OSSA Director'
      });
      saveDB(db);
      notifyAuthChange();
      return true;
    }
    return false;
  },
  reviewExcuseApplication: (id: string, status: 'approved' | 'rejected', notes: string, waivedHours: number = 0) => {
    const db = getDB();
    if (db.excuse_applications[id]) {
      db.excuse_applications[id].status = status;
      db.excuse_applications[id].review_notes = notes;
      db.excuse_applications[id].reviewed_at = Date.now();
      db.excuse_applications[id].reviewed_by = 'OSSA Director';
      db.excuse_applications[id].waived_hours = waivedHours;

      // If approved and waivedHours > 0, deduct from student's sanction_hours
      if (status === 'approved' && waivedHours > 0) {
        const studentUid = db.excuse_applications[id].student_uid;
        if (db.users[studentUid]) {
          const current = db.users[studentUid].stats.sanction_hours || 0;
          const newTotal = Math.max(0, current - waivedHours);
          db.users[studentUid].stats.sanction_hours = newTotal;
          if (!db.sanction_logs[studentUid]) db.sanction_logs[studentUid] = [];
          db.sanction_logs[studentUid].unshift({
            timestamp: Date.now(),
            change: -waivedHours,
            new_total: newTotal,
            reason: `Excuse Application Approved (${db.excuse_applications[id].category.toUpperCase()}): ${notes}`,
            performed_by: 'OSSA Director'
          });
        }
      }
      saveDB(db);
      notifyAuthChange();
      return true;
    }
    return false;
  },
  submitExcuseApplication: (app: Omit<ExcuseApplication, 'id' | 'submission_date' | 'status'>) => {
    const db = getDB();
    const id = `exc_${Date.now()}`;
    const newApp: ExcuseApplication = {
      ...app,
      id,
      submission_date: Date.now(),
      status: 'pending'
    };
    if (!db.excuse_applications) db.excuse_applications = {};
    db.excuse_applications[id] = newApp;
    saveDB(db);
    notifyAuthChange();
    return newApp;
  },
  submitApplication: (data: UserProfile, password = 'password123') => {
    const db = getDB();
    const studentId = data.student_id.trim().toLowerCase();
    const email = data.email.trim().toLowerCase();
    const username = data.username.trim().toLowerCase();
    const profiles = [
      ...Object.values(db.users).map(user => user.profile),
      ...Object.values(db.applications).map(application => application.form_data),
    ].filter(profile => profile.uid !== data.uid);
    if (profiles.some(profile => profile.student_id.trim().toLowerCase() === studentId)) {
      throw new Error('That student ID already has an account or pending application.');
    }
    if (profiles.some(profile => profile.email.trim().toLowerCase() === email || profile.username.trim().toLowerCase() === username)) {
      throw new Error('That email or username is already in use.');
    }
    db.applications[data.uid] = {
      id: data.uid,
      status: 'pending',
      submission_date: Date.now(),
      rejection_count: 0,
      form_data: { ...data, account_status: 'pending' }
    };
    db.application_credentials![data.uid] = password;
    saveDB(db);
  },
  replaceSchoolStructure: (nodes: SchoolNode[]) => {
    const db = getDB();
    db.school_structure = JSON.parse(JSON.stringify(nodes));
    saveDB(db);
  },
  updateSchoolNode: (id: string, changes: Partial<Pick<SchoolNode, 'name' | 'type' | 'metadata'>>) => {
    const db = getDB();
    const update = (nodes: SchoolNode[]): boolean => {
      for (const item of nodes) {
        if (item.id === id) {
          if (changes.name !== undefined) item.name = changes.name;
          if (changes.type !== undefined) item.type = changes.type;
          if (changes.metadata !== undefined) item.metadata = { ...(item.metadata || {}), ...changes.metadata };
          return true;
        }
        if (update(item.children || [])) return true;
      }
      return false;
    };
    const changed = update(db.school_structure);
    if (changed) saveDB(db);
    return changed;
  },
  archiveSchoolNode: (id: string) => {
    const db = getDB();
    const archive = (nodes: SchoolNode[]): boolean => {
      for (const item of nodes) {
        if (item.id === id) {
          item.metadata = { ...(item.metadata || {}), archived: true };
          return true;
        }
        if (archive(item.children || [])) return true;
      }
      return false;
    };
    const changed = archive(db.school_structure);
    if (changed) saveDB(db);
    return changed;
  },
  deleteSchoolNode: (id: string) => {
    const db = getDB();
    const referencedByUser = Object.values(db.users).some(({ profile }) =>
      profile.school_data.academic_assignment?.nodePathIds.includes(id)
      || profile.official_data?.assignment_node_path_ids?.includes(id),
    );
    const referencedByEvent = Object.values(db.events).some((event) => event.audienceTarget?.nodeId === id);
    if (referencedByUser || referencedByEvent) return false;
    const remove = (nodes: SchoolNode[]): boolean => {
      const index = nodes.findIndex((item) => item.id === id);
      if (index >= 0) {
        if ((nodes[index].children || []).length > 0) return false;
        nodes.splice(index, 1);
        return true;
      }
      return nodes.some((item) => remove(item.children || []));
    };
    const changed = remove(db.school_structure);
    if (changed) saveDB(db);
    return changed;
  },
  approveApplication: (id: string, role: any = 'student') => {
    const db = getDB();
    const app = db.applications[id];
    if (app) {
      db.users[id] = {
        password: db.application_credentials?.[id] || 'password123',
        profile: { ...app.form_data, role, account_status: 'active' },
        stats: { attendance_rate: 100, sanction_hours: 0, events_attended: 0, events_missed: 0 }
      };
      db.usernames[app.form_data.username.toLowerCase()] = app.form_data.email.toLowerCase();
      delete db.applications[id];
      if (db.application_credentials) delete db.application_credentials[id];
      saveDB(db);
    }
  },
  createEvent: (ev: Omit<AppEvent, 'id'>) => {
    const db = getDB();
    const id = `ev_${Date.now()}`;
    db.events[id] = { ...ev, id } as AppEvent;
    saveDB(db);
  },
  updateEvent: (id: string, changes: Partial<Omit<AppEvent, 'id'>>) => {
    const db = getDB();
    if (!db.events[id]) return false;
    db.events[id] = { ...db.events[id], ...changes, id };
    saveDB(db);
    return true;
  },
  archiveEvent: (id: string) => {
    const db = getDB();
    if (!db.events[id]) return false;
    db.events[id].status = 'done'; saveDB(db); return true;
  },
  cancelEvent: (id: string) => {
    const db = getDB();
    if (!db.events[id]) return false;
    db.events[id].status = 'done'; db.events[id].cancellationStatus = 'cancelled'; saveDB(db); return true;
  },
  deleteEvent: (id: string) => {
    const db = getDB();
    if (!db.events[id]) return false;
    delete db.events[id]; delete db.attendance_logs[id]; saveDB(db); return true;
  },
  logAttendance: (eventId: string, studentUid: string, loggerUid: string, loggerName: string, recordTime?: number) => {
    const db = getDB();
    if (!db.attendance_logs[eventId]) db.attendance_logs[eventId] = {};
    const existingRecord = db.attendance_logs[eventId][studentUid];
    if (existingRecord) return { ...existingRecord, already_recorded: true };

    const recordedAt = recordTime || Date.now();
    const event = db.events[eventId];
    const rawStartTime = event?.startTime;
    const parsedStartTime = typeof rawStartTime === 'number' ? rawStartTime : Date.parse(String(rawStartTime || ''));
    const configuredWindows = event?.attendanceWindows || [];
    const scanDate = new Date(recordedAt);
    const scanMinutes = scanDate.getHours() * 60 + scanDate.getMinutes();
    const parseMinutes = (value: string) => {
      const [hours, minutes] = value.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const applicableWindow = [...configuredWindows]
      .sort((left, right) => parseMinutes(left.timeIn) - parseMinutes(right.timeIn))
      .filter((window) => parseMinutes(window.timeIn) <= scanMinutes)
      .at(-1) || configuredWindows[0];
    const configuredStart = applicableWindow ? new Date(recordedAt) : null;
    if (configuredStart && applicableWindow) {
      const [hours, minutes] = applicableWindow.timeIn.split(':').map(Number);
      configuredStart.setHours(hours, minutes, 0, 0);
    }
    const lateThreshold = applicableWindow
      ? configuredStart!.getTime() + applicableWindow.lateAfterMinutes * 60 * 1000
      : parsedStartTime + 15 * 60 * 1000;
    const status: 'present' | 'late' = Number.isFinite(lateThreshold) && recordedAt > lateThreshold
      ? 'late'
      : 'present';
    const record = {
      time_in: recordedAt,
      status,
      already_recorded: false,
      scanned_by_uid: loggerUid,
      scanned_by_name: loggerName
    };
    db.attendance_logs[eventId][studentUid] = record;
    if (db.users[studentUid]) {
      db.users[studentUid].stats.events_attended++;
    }
    saveDB(db);
    return record;
  }
};
