
import { TEST_ACCOUNTS } from './seed';
import { UserProfile, UserStats, Application, AppEvent, SchoolNode, ExcuseApplication } from '../types';

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
  application_credentials?: Record<string, string>;
}

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

  // Ensure all TEST_ACCOUNTS exist in db.users & db.usernames
  let updated = false;
  TEST_ACCOUNTS.forEach(acc => {
    const uid = `mock_uid_${acc.user}`;
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
      if (testAcc) {
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
      if (userEntry.password === pass || pass === 'password123') {
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
    type: 'school',
    logo_url: 'https://placehold.co/400x400/0E1B42/D4AF37?text=RMC',
    children: [
      {
        id: 'dept_jhs',
        name: 'Junior High School',
        type: 'department',
        children: [
          { id: 'lvl_g7', name: 'Grade 7', type: 'level', children: [{ id: 'sec_narra', name: 'Narra', type: 'section' }] },
          { id: 'lvl_g10', name: 'Grade 10', type: 'level', children: [{ id: 'sec_kamagong', name: 'Kamagong', type: 'section' }] }
        ]
      },
      {
        id: 'dept_shs',
        name: 'Senior High School',
        type: 'department',
        children: [
          { 
            id: 'track_acad', 
            name: 'Academic Track', 
            type: 'track', 
            children: [
              {
                id: 'strand_stem',
                name: 'STEM',
                type: 'strand',
                children: [
                  { 
                    id: 'lvl_shs_g12', 
                    name: 'Grade 12', 
                    type: 'level', 
                    children: [
                      { id: 'sec_newton', name: 'Newton', type: 'section' },
                      { id: 'sec_einstein', name: 'Einstein', type: 'section' }
                    ]
                  },
                  { 
                    id: 'lvl_shs_g11', 
                    name: 'Grade 11', 
                    type: 'level', 
                    children: [{ id: 'sec_pascal', name: 'Pascal', type: 'section' }]
                  }
                ]
              },
              {
                id: 'strand_abm',
                name: 'ABM',
                type: 'strand',
                children: [{ id: 'lvl_shs_g12_abm', name: 'Grade 12', type: 'level', children: [{ id: 'sec_luca', name: 'Luca Pacioli', type: 'section' }] }]
              }
            ]
          }
        ]
      },
      {
        id: 'dept_college_root',
        name: 'College',
        type: 'department',
        children: [
          {
            id: 'col_cas',
            name: 'College of Arts and Sciences',
            type: 'track',
            children: [
              {
                id: 'prog_bscs',
                name: 'BS Computer Science',
                type: 'strand',
                children: [
                  { id: 'sec_cs1a', name: 'CS-1A', type: 'section' },
                  { id: 'sec_cs2a', name: 'CS-2A', type: 'section' }
                ]
              }
            ]
          }
        ]
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
  getEvents: () => Object.values(ensureMockReferenceData().events),
  getApplications: () => Object.values(getDB().applications),
  getExcuseApplications: () => Object.values(getDB().excuse_applications || {}),
  getSchoolStructure: () => getDB().school_structure,
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
  getStudentsBySection: (sectionName: string) => {
    const db = getDB();
    return Object.values(db.users)
      .filter(u => u.profile.school_data.section === sectionName)
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
  createUser: (profile: Omit<UserProfile, 'uid' | 'photo_url'>, password = 'password123') => {
    const db = getDB();
    const uid = `u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    db.usernames[profile.username.toLowerCase()] = profile.email.toLowerCase();
    db.users[uid] = {
      password,
      profile: {
        ...profile,
        account_status: profile.account_status || 'active',
        uid,
        photo_url: `https://i.pravatar.cc/150?u=${uid}`,
      } as UserProfile,
      stats: {
        attendance_rate: 100,
        sanction_hours: 0,
        events_attended: 0,
        events_missed: 0
      }
    };
    saveDB(db);
    return uid;
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
  logAttendance: (eventId: string, studentUid: string, loggerUid: string, loggerName: string, recordTime?: number) => {
    const db = getDB();
    if (!db.attendance_logs[eventId]) db.attendance_logs[eventId] = {};
    const existingRecord = db.attendance_logs[eventId][studentUid];
    if (existingRecord) return { ...existingRecord, already_recorded: true };

    const recordedAt = recordTime || Date.now();
    const event = db.events[eventId];
    const rawStartTime = event?.startTime;
    const parsedStartTime = typeof rawStartTime === 'number' ? rawStartTime : Date.parse(String(rawStartTime || ''));
    const gracePeriodMs = 15 * 60 * 1000;
    const status: 'present' | 'late' = Number.isFinite(parsedStartTime) && recordedAt > parsedStartTime + gracePeriodMs
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
