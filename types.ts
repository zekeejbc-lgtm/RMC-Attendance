
export type UserRole = 'student' | 'mayor' | 'ssg' | 'admin' | 'ossa';

export interface ExcuseApplication {
  id: string;
  student_uid: string;
  student_name: string;
  student_id: string;
  department: string;
  section: string;
  event_title: string;
  category: 'medical' | 'personal' | 'institutional' | 'emergency';
  reason: string;
  proof_url?: string;
  submission_date: number;
  status: 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  waived_hours?: number;
  reviewed_at?: number;
  reviewed_by?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  username: string;
  role: UserRole;
  student_id: string;
  photo_url: string;
  email: string;
  phone?: string;
  guardian?: {
    name: string;
    contact: string;
    email: string;
  };
  school_data: {
    type: 'High School' | 'College';
    level: string; 
    section: string;
    department?: string; 
    track?: string; 
    strand?: string;
    program?: string; 
    major?: string;
    school_id?: string;
  };
}

export interface UserStats {
  attendance_rate: number;
  sanction_hours: number; 
  events_attended: number;
  events_missed: number;
}

export interface AppEvent {
  id: string;
  title: string;
  description?: string;
  created_by: string;
  status: 'upcoming' | 'active' | 'done';
  startTime: number;
  endTime: number;
  penaltyValue: number;
  penaltyUnit: 'hours' | 'minutes';
  participantsType: 'all' | 'department' | 'track' | 'strand' | 'level' | 'section' | 'specific';
  targetValue?: string; // e.g., "Senior High School" or "STEM" or "Grade 12"
  specificParticipants?: string[];
  target: {
    all: boolean;
    department?: string[];
    strand?: string[];
    section?: string[];
  };
  location: {
    lat: number;
    lng: number;
    radius_meters: number;
  };
  timestamp: number;
}

export interface SchoolNode {
  id: string;
  name: string;
  type: 'school' | 'department' | 'sub_department' | 'track' | 'strand' | 'specialization' | 'level' | 'section' | 'college' | 'program' | 'major' | 'secondary' | 'elementary' | 'special';
  logo_url?: string;
  children?: SchoolNode[];
  metadata?: any;
}

export interface Application {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  submission_date: number;
  rejection_count: number;
  rejection_reason?: string;
  form_data: UserProfile;
}
