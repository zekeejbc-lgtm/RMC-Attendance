
import { TEST_ACCOUNTS } from './seed';
import { UserProfile, UserStats, Application, Event, SchoolNode } from '../types';

const STORAGE_KEY = 'rmc_regalia_db';

interface MockDB {
  users: Record<string, { profile: UserProfile; stats: UserStats; password: string }>;
  usernames: Record<string, string>;
  applications: Record<string, Application>;
  events: Record<string, Event>;
  attendance_logs: Record<string, Record<string, any>>;
  sanction_logs: Record<string, any[]>;
  school_structure: SchoolNode[];
}

export const getDB = (): MockDB => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { 
      users: {}, 
      usernames: {}, 
      applications: {}, 
      events: {}, 
      attendance_logs: {},
      sanction_logs: {},
      school_structure: []
    };
  } catch (e) {
    return { users: {}, usernames: {}, applications: {}, events: {}, attendance_logs: {}, sanction_logs: {}, school_structure: [] };
  }
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
    
    const userEntry = Object.values(db.users).find(u => 
      u.profile.username.toLowerCase() === cleanId || 
      u.profile.email.toLowerCase() === email.toLowerCase()
    );
    
    if (userEntry && userEntry.password === pass) {
      localStorage.setItem('rmc_mock_session', userEntry.profile.uid);
      notifyAuthChange();
      return userEntry;
    }
    throw new Error(`Invalid credentials for '${identifier}'.`);
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

export const mockSeed = () => {
  const db = getDB();
  db.users = {};
  db.usernames = {};
  
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
  db.school_structure = [defaultSchool];

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
        student_id: acc.user === 'student' ? '2024-00123' : `ID-${Math.floor(Math.random() * 9000) + 1000}`,
        photo_url: `https://i.pravatar.cc/150?u=${uid}`,
        school_data: {
          type: acc.user === 'student' ? 'High School' : 'College',
          department: acc.user === 'student' ? "Senior High School" : 'College of Arts and Sciences',
          level: "Grade 12",
          section: "Newton",
          school_id: 'school_rmc'
        }
      },
      stats: {
        attendance_rate: 98,
        sanction_hours: acc.role === 'student' ? 12 : 0,
        events_attended: 15,
        events_missed: 1
      }
    };
  });
  
  db.events['e1'] = {
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
  } as Event;
  
  saveDB(db);
};

export const mockData = {
  getEvents: () => Object.values(getDB().events),
  getApplications: () => Object.values(getDB().applications),
  getSchoolStructure: () => getDB().school_structure,
  getStudentsBySection: (sectionName: string) => {
    const db = getDB();
    return Object.values(db.users)
      .filter(u => u.profile.school_data.section === sectionName)
      .map(u => ({ ...u.profile, stats: u.stats }));
  },
  getUserProfile: (studentIdentifier: string) => {
    const db = getDB();
    // Search across uid and student_id
    return Object.values(db.users).find(u => 
      u.profile.uid === studentIdentifier || 
      u.profile.student_id === studentIdentifier
    )?.profile;
  },
  getUserDetail: (uid: string) => {
    const db = getDB();
    return db.users[uid];
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
  adjustSanctionHours: (uid: string, hours: number, reason: string = "Manual Adjustment") => {
    const db = getDB();
    if (db.users[uid]) {
      db.users[uid].stats.sanction_hours = Math.max(0, db.users[uid].stats.sanction_hours + hours);
      if (!db.sanction_logs[uid]) db.sanction_logs[uid] = [];
      db.sanction_logs[uid].push({ timestamp: Date.now(), change: hours, reason });
      saveDB(db);
      return true;
    }
    return false;
  },
  submitApplication: (data: UserProfile) => {
    const db = getDB();
    db.applications[data.uid] = {
      id: data.uid,
      status: 'pending',
      submission_date: Date.now(),
      rejection_count: 0,
      form_data: data
    };
    saveDB(db);
  },
  approveApplication: (id: string, role: any = 'student') => {
    const db = getDB();
    const app = db.applications[id];
    if (app) {
      db.users[id] = {
        password: 'password123',
        profile: { ...app.form_data, role },
        stats: { attendance_rate: 100, sanction_hours: 0, events_attended: 0, events_missed: 0 }
      };
      delete db.applications[id];
      saveDB(db);
    }
  },
  createEvent: (ev: Omit<Event, 'id'>) => {
    const db = getDB();
    const id = `ev_${Date.now()}`;
    db.events[id] = { ...ev, id } as Event;
    saveDB(db);
  },
  logAttendance: (eventId: string, studentUid: string, loggerUid: string, loggerName: string) => {
    const db = getDB();
    if (!db.attendance_logs[eventId]) db.attendance_logs[eventId] = {};
    db.attendance_logs[eventId][studentUid] = {
      time_in: Date.now(),
      scanned_by_uid: loggerUid,
      scanned_by_name: loggerName
    };
    if (db.users[studentUid]) {
      db.users[studentUid].stats.events_attended++;
    }
    saveDB(db);
  }
};
