export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'holiday';
export type SessionType = 'lecture' | 'lab' | 'tutorial' | 'extra';
export type AttendanceRecordStatus = 'attended' | 'absent' | 'unmarked';
export type CRAssignmentStatus = 'pending' | 'approved' | 'revoked';
export type TimetableImportStatus = 'pending' | 'extracted' | 'reviewed' | 'published' | 'failed';
export type ChangeLogAction = 'cancelled' | 'rescheduled' | 'extra_added' | 'room_changed' | 'reopened' | 'corrected';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'student' | 'cr' | 'admin';
          class_group_id: string | null;
          roll_number: string | null;
          avatar_url: string | null;
          phone: string | null;
          course: string | null;
          semester: number | null;
          class_group: 'Group 1' | 'Group 2' | 'Group 3' | null;
          class_roll_number: string | null;
          is_onboarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: 'student' | 'cr' | 'admin';
          class_group_id?: string | null;
          roll_number?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          course?: string | null;
          semester?: number | null;
          class_group?: 'Group 1' | 'Group 2' | 'Group 3' | null;
          class_roll_number?: string | null;
          is_onboarded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'student' | 'cr' | 'admin';
          class_group_id?: string | null;
          roll_number?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          course?: string | null;
          semester?: number | null;
          class_group?: 'Group 1' | 'Group 2' | 'Group 3' | null;
          class_roll_number?: string | null;
          is_onboarded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      class_groups: {
        Row: {
          id: string;
          course: string;
          department: string;
          year: number;
          section: string;
          name: string;
          academic_year: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          course: string;
          department: string;
          year: number;
          section: string;
          name: string;
          academic_year?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          course?: string;
          department?: string;
          year?: number;
          section?: string;
          name?: string;
          academic_year?: string;
          created_at?: string;
        };
      };
      class_group_members: {
        Row: {
          id: string;
          class_group_id: string;
          student_id: string;
          is_active: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          class_group_id: string;
          student_id: string;
          is_active?: boolean;
          joined_at?: string;
        };
        Update: {
          id?: string;
          class_group_id?: string;
          student_id?: string;
          is_active?: boolean;
          joined_at?: string;
        };
      };
      class_subgroups: {
        Row: {
          id: string;
          class_group_id: string;
          name: string;
          code: string;
          capacity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          class_group_id: string;
          name: string;
          code: string;
          capacity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          class_group_id?: string;
          name?: string;
          code?: string;
          capacity?: number;
          created_at?: string;
        };
      };
      subgroup_members: {
        Row: {
          id: string;
          subgroup_id: string;
          student_id: string;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          subgroup_id: string;
          student_id: string;
          assigned_at?: string;
        };
        Update: {
          id?: string;
          subgroup_id?: string;
          student_id?: string;
          assigned_at?: string;
        };
      };
      cr_assignments: {
        Row: {
          id: string;
          user_id: string;
          class_group_id: string;
          subgroup_id: string | null;
          status: CRAssignmentStatus;
          approved_by: string | null;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          class_group_id: string;
          subgroup_id?: string | null;
          status?: CRAssignmentStatus;
          approved_by?: string | null;
          assigned_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          class_group_id?: string;
          subgroup_id?: string | null;
          status?: CRAssignmentStatus;
          approved_by?: string | null;
          assigned_at?: string;
        };
      };
      subjects: {
        Row: {
          id: string;
          class_group_id: string;
          code: string;
          name: string;
          credits: number;
          faculty_name: string | null;
          room: string | null;
          color: string;
          min_attendance_pct: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_group_id: string;
          code: string;
          name: string;
          credits?: number;
          faculty_name?: string | null;
          room?: string | null;
          color?: string;
          min_attendance_pct?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          class_group_id?: string;
          code?: string;
          name?: string;
          credits?: number;
          faculty_name?: string | null;
          room?: string | null;
          color?: string;
          min_attendance_pct?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      timetable_imports: {
        Row: {
          id: string;
          class_group_id: string;
          file_path: string | null;
          file_name: string | null;
          scan_status: TimetableImportStatus;
          draft_data: Json;
          uploader_id: string | null;
          notes: string | null;
          created_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          class_group_id: string;
          file_path?: string | null;
          file_name?: string | null;
          scan_status?: TimetableImportStatus;
          draft_data?: Json;
          uploader_id?: string | null;
          notes?: string | null;
          created_at?: string;
          published_at?: string | null;
        };
        Update: {
          id?: string;
          class_group_id?: string;
          file_path?: string | null;
          file_name?: string | null;
          scan_status?: TimetableImportStatus;
          draft_data?: Json;
          uploader_id?: string | null;
          notes?: string | null;
          created_at?: string;
          published_at?: string | null;
        };
      };
      class_sessions: {
        Row: {
          id: string;
          class_group_id: string;
          subgroup_id: string | null;
          subject_id: string;
          date: string;
          start_time: string;
          end_time: string;
          room: string | null;
          faculty_name: string | null;
          session_type: SessionType;
          status: SessionStatus;
          cancellation_reason: string | null;
          import_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_group_id: string;
          subgroup_id?: string | null;
          subject_id: string;
          date: string;
          start_time: string;
          end_time: string;
          room?: string | null;
          faculty_name?: string | null;
          session_type?: SessionType;
          status?: SessionStatus;
          cancellation_reason?: string | null;
          import_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          class_group_id?: string;
          subgroup_id?: string | null;
          subject_id?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          room?: string | null;
          faculty_name?: string | null;
          session_type?: SessionType;
          status?: SessionStatus;
          cancellation_reason?: string | null;
          import_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      attendance_records: {
        Row: {
          id: string;
          session_id: string;
          student_id: string;
          status: AttendanceRecordStatus;
          remarks: string | null;
          marked_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          student_id: string;
          status?: AttendanceRecordStatus;
          remarks?: string | null;
          marked_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          student_id?: string;
          status?: AttendanceRecordStatus;
          remarks?: string | null;
          marked_at?: string;
          updated_at?: string;
        };
      };
      class_change_log: {
        Row: {
          id: string;
          session_id: string | null;
          class_group_id: string;
          changed_by: string | null;
          action: ChangeLogAction;
          reason: string;
          old_values: Json;
          new_values: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          class_group_id: string;
          changed_by?: string | null;
          action: ChangeLogAction;
          reason: string;
          old_values?: Json;
          new_values?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          class_group_id?: string;
          changed_by?: string | null;
          action?: ChangeLogAction;
          reason?: string;
          old_values?: Json;
          new_values?: Json;
          created_at?: string;
        };
      };
      assignments: {
        Row: {
          id: string;
          class_group_id: string;
          subject_id: string | null;
          title: string;
          description: string | null;
          due_date: string;
          status: string;
          max_marks: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          class_group_id: string;
          subject_id?: string | null;
          title: string;
          description?: string | null;
          due_date: string;
          status?: string;
          max_marks?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          class_group_id?: string;
          subject_id?: string | null;
          title?: string;
          description?: string | null;
          due_date?: string;
          status?: string;
          max_marks?: number | null;
          created_at?: string;
        };
      };
      study_materials: {
        Row: {
          id: string;
          class_group_id: string;
          subject_id: string | null;
          title: string;
          topic: string | null;
          file_path: string | null;
          tags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          class_group_id: string;
          subject_id?: string | null;
          title: string;
          topic?: string | null;
          file_path?: string | null;
          tags?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          class_group_id?: string;
          subject_id?: string | null;
          title?: string;
          topic?: string | null;
          file_path?: string | null;
          tags?: string[];
          created_at?: string;
        };
      };
    };
  };
}

// Convenience Type Aliases
export type Profile = Database['public']['Tables']['profiles']['Row'] & {
  role?: UserRole;
  class_group_id?: string | null;
  target_attendance_pct?: number;
  subgroupId?: string | null;
  course?: string | null;
  semester?: number | null;
  class_group?: 'Group 1' | 'Group 2' | 'Group 3' | null;
  class_roll_number?: string | null;
  is_onboarded?: boolean;
};
export type ClassGroup = Database['public']['Tables']['class_groups']['Row'];
export type ClassSubgroup = Database['public']['Tables']['class_subgroups']['Row'];
export type SubgroupMember = Database['public']['Tables']['subgroup_members']['Row'];
export type CRAssignment = Database['public']['Tables']['cr_assignments']['Row'];
export type Subject = Database['public']['Tables']['subjects']['Row'];
export type TimetableImport = Database['public']['Tables']['timetable_imports']['Row'];
export type ClassSession = Database['public']['Tables']['class_sessions']['Row'];
export type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row'];
export type ClassChangeLog = Database['public']['Tables']['class_change_log']['Row'];
export type Assignment = Database['public']['Tables']['assignments']['Row'];
export type StudyMaterial = Database['public']['Tables']['study_materials']['Row'];

// Backward compatibility alias for legacy components
export type UserRole = 'student' | 'cr' | 'admin';
export interface ClassAnnouncement {
  id: string;
  class_group_id: string;
  type: 'cancellation' | 'holiday' | 'extra_class' | 'general';
  title: string;
  message: string;
  affected_date?: string | null;
  affected_subject?: string | null;
  created_by?: string | null;
  created_at: string;
}
export interface TimetableVersion {
  id: string;
  class_group_id: string;
  version_number: number;
  status: 'draft' | 'published' | 'archived';
  file_path: string | null;
  file_name: string | null;
  notes: string | null;
  uploaded_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
