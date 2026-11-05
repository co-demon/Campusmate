import {
  ClassGroup,
  ClassSubgroup,
  SubgroupMember,
  CRAssignment,
  Profile,
  Subject as DBSubject,
  TimetableImport,
  ClassSession,
  AttendanceRecord,
  ClassChangeLog,
  ClassAnnouncement,
  TimetableVersion,
  UserRole,
  SessionStatus,
  SessionType,
  AttendanceRecordStatus
} from "@/types/database.types";

export type {
  ClassGroup,
  ClassSubgroup,
  SubgroupMember,
  CRAssignment,
  Profile,
  TimetableImport,
  ClassSession,
  AttendanceRecord,
  ClassChangeLog,
  ClassAnnouncement,
  TimetableVersion,
  UserRole,
  SessionStatus,
  SessionType,
  AttendanceRecordStatus
};

export interface TimetableEntry {
  id: string;
  version_id?: string;
  class_group_id?: string;
  subgroup_id?: string | null;
  subgroup_code?: string | null;
  weekday: number; // 1-7
  day_of_week?: number;
  subject_code: string;
  subject_name: string;
  subject_id?: string;
  start_time: string;
  end_time: string;
  room?: string | null;
  instructor?: string | null;
  faculty_name?: string | null;
  slot_type: SessionType;
  is_active?: boolean;
  created_at?: string;
}

export interface ClassOccurrence {
  id: string;
  session_id?: string;
  class_group_id?: string;
  subgroup_id?: string | null;
  subgroup_code?: string | null;
  subject_id: string;
  timetable_entry_id?: string | null;
  date: string; // YYYY-MM-DD
  start_time: string;
  end_time: string;
  room?: string | null;
  faculty_name?: string | null;
  event_type?: 'regular' | 'extra' | 'rescheduled';
  status: SessionStatus;
  cancellation_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string | null;
  applies_to_all?: boolean;
}

export interface CandidateDraftEntry {
  id: string;
  weekday: number; // 1-7 (1=Monday)
  subjectCode: string;
  subjectName: string;
  startTime: string; // HH:mm:ss
  endTime: string;   // HH:mm:ss
  room?: string;
  instructor?: string;
  slotType: SessionType;
  subgroupCode?: string | null; // e.g. "A", "B", "C" or null (whole class)
  
  // Validation flags for CR Review
  isMissingSubject?: boolean;
  isUncertain?: boolean;
  isTimetableGap?: boolean;
  notes?: string;
}

export interface TimetableEntryDraft {
  id?: string;
  weekday: number; // 1-7 (1=Monday)
  subjectCode: string;
  subjectName: string;
  startTime: string; // HH:mm:ss
  endTime: string;   // HH:mm:ss
  room?: string;
  instructor?: string;
  slotType: SessionType;
  subgroupCode?: string | null;
  isMissingSubject?: boolean;
  isUncertain?: boolean;
  isTimetableGap?: boolean;
}

export interface EnrichedTimetableEntry extends TimetableEntry {
  attendanceRecord?: AttendanceRecord;
  isToday?: boolean;
  isSubgroupSession?: boolean;
}

export interface ClassGroupWithActiveTimetable extends ClassGroup {
  publishedVersion?: TimetableVersion | null;
  subgroups: ClassSubgroup[];
  entries: TimetableEntry[];
  announcements: ClassAnnouncement[];
  crProfile?: Profile | null;
}

export interface Subject {
  id: string;
  class_group_id?: string;
  code: string;
  name: string;
  credits?: number;
  facultyName?: string;
  faculty_name?: string | null;
  room?: string;
  color?: string;
  min_attendance_pct?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ExtractedSlot {
  subjectCode: string;
  subjectName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
  facultyName?: string;
  slotType: SessionType;
  subgroupCode?: string | null; // e.g. "A", "B", "C" or null for whole class
  confidence?: number;
  warnings?: string[];
}

export interface ExtractedTimetable {
  semesterLabel?: string;
  startDate?: string;
  endDate?: string;
  detectedSubgroups?: string[]; // e.g. ["A", "B", "C"]
  subjects: Array<{
    code: string;
    name: string;
    credits?: number;
    facultyName?: string;
    room?: string;
    color?: string;
  }>;
  slots: ExtractedSlot[];
  confidence: number;
  warnings?: string[];
  flags?: {
    missingSubjectsCount: number;
    uncertainEntriesCount: number;
    timetableGapsCount: number;
  };
}

export interface EnrichedClassOccurrence {
  id: string;
  session_id?: string;
  class_group_id?: string;
  subgroup_id?: string | null;
  subgroup_code?: string | null;
  subject_id: string;
  date: string;
  start_time: string;
  end_time: string;
  room?: string | null;
  faculty_name?: string | null;
  status: SessionStatus;
  cancellation_reason?: string | null;
  attendanceRecord?: AttendanceRecord | null;
  subject?: { code: string; name: string; color?: string };
}
