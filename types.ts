
export type UserRole = 'student' | 'mayor' | 'ssg' | 'admin' | 'ossa';
export type AccountStatus = 'pending' | 'active' | 'suspended' | 'inactive' | 'graduated';

export type AcademicNodeType =
  | 'campus' | 'education_unit' | 'curriculum' | 'college' | 'department'
  | 'track' | 'elective_cluster' | 'strand' | 'program' | 'major'
  | 'grade_level' | 'year_level' | 'section' | 'block' | 'specialization' | 'custom'
  // Legacy aliases retained while saved structures migrate.
  | 'school' | 'sub_department' | 'level' | 'secondary' | 'elementary' | 'special';

export type AcademicPresetId = 'jhs' | 'strengthened_shs' | 'legacy_shs' | 'higher_ed' | 'blank';

export interface AcademicAssignment {
  campusId: string;
  nodePathIds: string[];
  terminalGroupId: string;
  curriculumCode?: string;
  academicYear?: string;
  affiliations?: Array<{
    nodeId?: string;
    type: 'tle_specialization' | 'academic_elective' | 'techpro_elective' | 'major' | 'other';
    name: string;
  }>;
}

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
  account_status?: AccountStatus;
  student_id: string;
  photo_url: string;
  email: string;
  phone?: string;
  guardian?: {
    name: string;
    contact: string;
    email?: string;
  };
  official_data?: {
    body: 'SSG' | 'OSSA' | 'Administration';
    position?: string;
    scope?: string;
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
    academic_assignment?: AcademicAssignment;
  };
}

export interface UserStats {
  attendance_rate: number;
  sanction_hours: number; 
  events_attended: number;
  events_missed: number;
}

export interface EventAttendanceWindow {
  id: string;
  label?: string;
  timeIn: string;
  timeOut: string;
  lateAfterMinutes: number;
}

export interface EventSanctionRule {
  value: number;
  unit: 'hours' | 'minutes';
}

export interface AppEvent {
  id: string;
  title: string;
  description?: string;
  created_by: string;
  status: 'upcoming' | 'active' | 'done';
  cancellationStatus?: 'cancelled' | 'dropped';
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
  startDate?: string;
  endDate?: string;
  attendanceWindows?: EventAttendanceWindow[];
  sanctionRules?: {
    late: EventSanctionRule;
    absent: EventSanctionRule;
  };
  recipientGroups?: string[];
  geofenceEnabled?: boolean;
  audienceTarget?: {
    mode: 'all' | 'directory_node' | 'specific_people' | 'group_list';
    nodeId?: string;
    includeDescendants?: boolean;
    specificUserIds?: string[];
    snapshotLabel?: string;
    groups?: string[];
  };
}

export interface SchoolNode {
  id: string;
  name: string;
  type: AcademicNodeType;
  logo_url?: string;
  children?: SchoolNode[];
  metadata?: {
    schemaVersion?: number;
    educationLevel?: 'elementary' | 'jhs' | 'shs' | 'higher_ed' | 'graduate' | 'other';
    curriculumCode?: string;
    academicYearStart?: number;
    academicYearEnd?: number;
    officialGrouping?: boolean;
    selectableForRegistration?: boolean;
    selectableForEvents?: boolean;
    allowedChildTypes?: AcademicNodeType[];
    shortCode?: string;
    programLevel?: string;
    durationYears?: number;
    copcNumber?: string;
    archived?: boolean;
    legacyType?: string;
    migrationStatus?: 'migrated' | 'needs_review';
    customFields?: Record<string, string | number | boolean>;
  };
}

export interface Application {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  submission_date: number;
  rejection_count: number;
  rejection_reason?: string;
  form_data: UserProfile;
}
