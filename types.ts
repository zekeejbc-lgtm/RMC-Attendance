
export type UserRole = 'student' | 'mayor' | 'ssg' | 'admin';

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

export interface Event {
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
  type: 'school' | 'department' | 'track' | 'strand' | 'level' | 'section';
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
