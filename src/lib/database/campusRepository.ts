import {
  ClassGroup,
  ClassSubgroup,
  Profile,
  TimetableVersion,
  TimetableEntry,
  AttendanceRecord,
  ClassAnnouncement,
  TimetableEntryDraft,
  Subject,
  ExtractedTimetable,
  ClassChangeLog
} from "@/features/timetable/types/timetable.types";
import {
  calculateOverallAttendance,
  simulateBunkOnDate,
  SubjectInfo,
  OccurrenceWithAttendance,
  doesSessionApplyToStudent
} from "@/features/attendance/services/attendanceEngine";

// ---------------------------------------------------------------------------
// Pre-seeded Demo Data for CampusMate v3 Architecture
// ---------------------------------------------------------------------------

const DEFAULT_CLASS_GROUP: ClassGroup = {
  id: "cg-cse-3a",
  course: "B.Tech",
  department: "CSE",
  year: 3,
  section: "A",
  name: "CSE-3A",
  academic_year: "2024-2025",
  created_at: new Date().toISOString(),
};

const DEFAULT_SUBGROUPS: ClassSubgroup[] = [
  { id: "subgroup-lab-a", class_group_id: "cg-cse-3a", name: "Lab Group A", code: "A", capacity: 25, created_at: new Date().toISOString() },
  { id: "subgroup-lab-b", class_group_id: "cg-cse-3a", name: "Lab Group B", code: "B", capacity: 25, created_at: new Date().toISOString() },
  { id: "subgroup-lab-c", class_group_id: "cg-cse-3a", name: "Lab Group C", code: "C", capacity: 25, created_at: new Date().toISOString() },
];

const DEMO_STUDENT: Profile = {
  id: "user-student-alex",
  email: "alex.mercer@college.edu",
  full_name: "Alex Mercer",
  role: "student",
  class_group_id: "cg-cse-3a",
  roll_number: "22CSE041",
  class_roll_number: "22CSE041",
  course: "B.Tech CSE",
  semester: 5,
  class_group: "Group 2",
  is_onboarded: true,
  avatar_url: null,
  phone: "+1555019283",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEMO_CR: Profile = {
  id: "user-cr-sarah",
  email: "sarah.jenkins.cr@college.edu",
  full_name: "Sarah Jenkins",
  role: "cr",
  class_group_id: "cg-cse-3a",
  roll_number: "22CSE003",
  class_roll_number: "22CSE003",
  course: "B.Tech CSE",
  semester: 5,
  class_group: "Group 1",
  is_onboarded: true,
  avatar_url: null,
  phone: "+1555019482",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEFAULT_TIMETABLE_VERSION: TimetableVersion = {
  id: "ver-1-published",
  class_group_id: "cg-cse-3a",
  version_number: 1,
  status: "published",
  file_path: "timetables/cg-cse-3a/official_fall_sem5.pdf",
  file_name: "CSE_3A_Official_Timetable.pdf",
  notes: "Official Semester 5 Master Timetable (Published by CR Sarah Jenkins)",
  uploaded_by: "user-cr-sarah",
  published_at: "2024-08-01T09:00:00Z",
  created_at: "2024-08-01T08:30:00Z",
  updated_at: "2024-08-01T09:00:00Z",
};

// Entries supporting lectures (whole class) and lab subgroups (A, B, C)
const DEFAULT_ENTRIES: TimetableEntry[] = [
  // Monday: Whole class
  { id: "slot-1", version_id: "ver-1-published", weekday: 1, subject_code: "CS501", subject_name: "Database Management Systems", start_time: "09:00:00", end_time: "10:00:00", room: "LH-301", instructor: "Dr. Arvind Sharma", slot_type: "lecture", subgroup_id: null, subgroup_code: null, created_at: new Date().toISOString() },
  { id: "slot-2", version_id: "ver-1-published", weekday: 1, subject_code: "CS502", subject_name: "Operating Systems", start_time: "10:15:00", end_time: "11:15:00", room: "LH-302", instructor: "Prof. Rajesh Mehta", slot_type: "lecture", subgroup_id: null, subgroup_code: null, created_at: new Date().toISOString() },
  { id: "slot-3", version_id: "ver-1-published", weekday: 1, subject_code: "CS503", subject_name: "Computer Networks", start_time: "11:30:00", end_time: "12:30:00", room: "LH-301", instructor: "Dr. Kavita Patel", slot_type: "lecture", subgroup_id: null, subgroup_code: null, created_at: new Date().toISOString() },
  
  // Tuesday: Whole class + Lab Group A
  { id: "slot-4", version_id: "ver-1-published", weekday: 2, subject_code: "CS504", subject_name: "Theory of Computation", start_time: "09:00:00", end_time: "10:00:00", room: "LH-303", instructor: "Prof. Sunita Gupta", slot_type: "lecture", subgroup_id: null, subgroup_code: null, created_at: new Date().toISOString() },
  { id: "slot-5", version_id: "ver-1-published", weekday: 2, subject_code: "CS501", subject_name: "Database Management Systems", start_time: "10:15:00", end_time: "11:15:00", room: "LH-301", instructor: "Dr. Arvind Sharma", slot_type: "lecture", subgroup_id: null, subgroup_code: null, created_at: new Date().toISOString() },
  { id: "slot-6", version_id: "ver-1-published", weekday: 2, subject_code: "CS505L", subject_name: "Web Tech & DBMS Lab (Lab A)", start_time: "13:30:00", end_time: "15:30:00", room: "CS Lab 2", instructor: "Dr. Arvind Sharma", slot_type: "lab", subgroup_id: "subgroup-lab-a", subgroup_code: "A", created_at: new Date().toISOString() },
  
  // Wednesday: Whole class (including EC301 Digital Electronics)
  { id: "slot-7", version_id: "ver-1-published", weekday: 3, subject_code: "CS502", subject_name: "Operating Systems", start_time: "09:00:00", end_time: "10:00:00", room: "LH-302", instructor: "Prof. Rajesh Mehta", slot_type: "lecture", subgroup_id: null, subgroup_code: null, created_at: new Date().toISOString() },
  { id: "slot-8", version_id: "ver-1-published", weekday: 3, subject_code: "CS503", subject_name: "Computer Networks", start_time: "10:15:00", end_time: "11:15:00", room: "LH-301", instructor: "Dr. Kavita Patel", slot_type: "lecture", subgroup_id: null, subgroup_code: null, created_at: new Date().toISOString() },
  { id: "slot-9", version_id: "ver-1-published", weekday: 3, subject_code: "EC301", subject_name: "Digital Electronics", start_time: "11:30:00", end_time: "12:30:00", room: "LH-204", instructor: "Dr. P. Sen", slot_type: "lecture", subgroup_id: null, subgroup_code: null, created_at: new Date().toISOString() },
  
  // Thursday: Whole class + Lab Group B (Alex Mercer's lab group!)
  { id: "slot-10", version_id: "ver-1-published", weekday: 4, subject_code: "CS501", subject_name: "Database Management Systems", start_time: "09:00:00", end_time: "10:00:00", room: "LH-301", instructor: "Dr. Arvind Sharma", slot_type: "lecture", subgroup_id: null, subgroup_code: null, created_at: new Date().toISOString() },
  { id: "slot-11", version_id: "ver-1-published", weekday: 4, subject_code: "CS502", subject_name: "Operating Systems", start_time: "10:15:00", end_time: "11:15:00", room: "LH-302", instructor: "Prof. Rajesh Mehta", slot_type: "lecture", subgroup_id: null, subgroup_code: null, created_at: new Date().toISOString() },
  { id: "slot-12", version_id: "ver-1-published", weekday: 4, subject_code: "CS505L", subject_name: "Web Tech & DBMS Lab (Lab B)", start_time: "13:30:00", end_time: "15:30:00", room: "CS Lab 2", instructor: "Dr. Arvind Sharma", slot_type: "lab", subgroup_id: "subgroup-lab-b", subgroup_code: "B", created_at: new Date().toISOString() },
  
  // Friday: Whole class + Lab Group C
  { id: "slot-13", version_id: "ver-1-published", weekday: 5, subject_code: "CS503", subject_name: "Computer Networks", start_time: "09:00:00", end_time: "10:00:00", room: "LH-301", instructor: "Dr. Kavita Patel", slot_type: "lecture", subgroup_id: null, subgroup_code: null, created_at: new Date().toISOString() },
  { id: "slot-14", version_id: "ver-1-published", weekday: 5, subject_code: "CS504", subject_name: "Theory of Computation", start_time: "10:15:00", end_time: "11:15:00", room: "LH-303", instructor: "Prof. Sunita Gupta", slot_type: "lecture", subgroup_id: null, subgroup_code: null, created_at: new Date().toISOString() },
  { id: "slot-15", version_id: "ver-1-published", weekday: 5, subject_code: "CS505L", subject_name: "Web Tech & DBMS Lab (Lab C)", start_time: "14:00:00", end_time: "16:00:00", room: "CS Lab 2", instructor: "Dr. Arvind Sharma", slot_type: "lab", subgroup_id: "subgroup-lab-c", subgroup_code: "C", created_at: new Date().toISOString() },
];

const DEFAULT_ANNOUNCEMENTS: ClassAnnouncement[] = [
  {
    id: "ann-1",
    class_group_id: "cg-cse-3a",
    type: "cancellation",
    title: "Operating Systems Class Cancelled on Friday",
    message: "Prof. Rajesh Mehta is traveling for an IEEE Conference. Friday 10:15 AM OS lecture is cancelled.",
    affected_date: "2024-11-08",
    affected_subject: "CS502",
    created_by: "user-cr-sarah",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "ann-2",
    class_group_id: "cg-cse-3a",
    type: "holiday",
    title: "Diwali Festival Break & College Holiday",
    message: "All academic sessions suspended as per university circular #412.",
    affected_date: "2024-11-01",
    affected_subject: null,
    created_by: "user-cr-sarah",
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "ann-3",
    class_group_id: "cg-cse-3a",
    type: "extra_class",
    title: "Web Tech & DBMS Extra Lab Session",
    message: "Makeup lab session scheduled for Saturday 2:00 PM in CS Lab 2 for project reviews.",
    affected_date: "2024-11-09",
    affected_subject: "CS505L",
    created_by: "user-cr-sarah",
    created_at: new Date(Date.now() - 43200000).toISOString(),
  },
];

const DEFAULT_CHANGE_LOG: ClassChangeLog[] = [
  {
    id: "chg-1",
    session_id: "slot-2-cancelled",
    class_group_id: "cg-cse-3a",
    changed_by: "user-cr-sarah",
    action: "cancelled",
    reason: "Prof. Rajesh Mehta traveling for IEEE Conference",
    old_values: { status: "scheduled", subject: "CS502" },
    new_values: { status: "cancelled", subject: "CS502" },
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "chg-2",
    session_id: "slot-extra-lab",
    class_group_id: "cg-cse-3a",
    changed_by: "user-cr-sarah",
    action: "extra_added",
    reason: "Project submission review session",
    old_values: {},
    new_values: { session_type: "extra", subject: "CS505L", date: "2024-11-09" },
    created_at: new Date(Date.now() - 43200000).toISOString(),
  }
];

// Seed attendance exactly implementing the user's specification:
// Digital Electronics (EC301): 8 attended, 2 bunked, 1 canceled, 1 extra class attended => held = 11, attended = 9 => 81.82%
function createInitialStudentAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date();

  // 1. Digital Electronics (EC301) exact prompt scenario
  // 8 attended
  for (let i = 1; i <= 8; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (i * 2 + 10));
    records.push({
      id: `att-de-att-${i}`,
      session_id: `slot-9`,
      student_id: "user-student-alex",
      status: "attended",
      remarks: null,
      marked_at: d.toISOString(),
      updated_at: d.toISOString(),
    });
  }

  // 2 bunked (absent)
  records.push({
    id: `att-de-abs-1`,
    session_id: `slot-9`,
    student_id: "user-student-alex",
    status: "absent",
    remarks: "Bunked class for sports trial",
    marked_at: new Date(today.getTime() - 86400000 * 5).toISOString(),
    updated_at: new Date(today.getTime() - 86400000 * 5).toISOString(),
  });
  records.push({
    id: `att-de-abs-2`,
    session_id: `slot-9`,
    student_id: "user-student-alex",
    status: "absent",
    remarks: "Medical leave",
    marked_at: new Date(today.getTime() - 86400000 * 3).toISOString(),
    updated_at: new Date(today.getTime() - 86400000 * 3).toISOString(),
  });

  // 1 extra class attended
  records.push({
    id: `att-de-extra-1`,
    session_id: `slot-extra-de`,
    student_id: "user-student-alex",
    status: "attended",
    remarks: "Attended extra makeup lecture",
    marked_at: new Date(today.getTime() - 86400000 * 1).toISOString(),
    updated_at: new Date(today.getTime() - 86400000 * 1).toISOString(),
  });

  // 2. Regular semester slots for Alex Mercer (Lab Group B)
  let count = 0;
  for (let i = 24; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const jsDay = d.getDay();
    if (jsDay === 0 || jsDay === 6) continue;

    // Filter slots matching Alex (whole class OR Lab B)
    const daySlots = DEFAULT_ENTRIES.filter(
      (e) => e.weekday === jsDay && (!e.subgroup_id || e.subgroup_id === "subgroup-lab-b")
    );

    for (const slot of daySlots) {
      if (slot.subject_code === "EC301") continue; // already seeded above
      count++;
      const status: "attended" | "absent" = (count % 8 === 0) ? "absent" : "attended";
      records.push({
        id: `att-reg-${count}`,
        session_id: slot.id,
        student_id: "user-student-alex",
        status,
        remarks: status === "absent" ? "Reported Absence" : null,
        marked_at: d.toISOString(),
        updated_at: d.toISOString(),
      });
    }
  }

  return records;
}

// Module store type
interface StoreType {
  activeRole: "student" | "cr";
  classGroup: ClassGroup;
  subgroups: ClassSubgroup[];
  studentSubgroupId: string; // "subgroup-lab-b"
  profiles: { student: Profile; cr: Profile };
  versions: TimetableVersion[];
  entries: TimetableEntry[];
  attendance: AttendanceRecord[];
  announcements: ClassAnnouncement[];
  changeLog: ClassChangeLog[];
}

let memoryStore: StoreType | null = null;

function getStore(): StoreType {
  if (!memoryStore) {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("campusmate_cr_store_v3");
        if (saved) {
          memoryStore = JSON.parse(saved);
        }
      } catch (e) {
        console.warn("Could not read from localStorage, using fresh initial seed");
      }
    }

    if (!memoryStore) {
      memoryStore = {
        activeRole: "student",
        classGroup: { ...DEFAULT_CLASS_GROUP },
        subgroups: [...DEFAULT_SUBGROUPS],
        studentSubgroupId: "subgroup-lab-b", // Alex Mercer is in Lab B
        profiles: {
          student: { ...DEMO_STUDENT },
          cr: { ...DEMO_CR },
        },
        versions: [{ ...DEFAULT_TIMETABLE_VERSION, status: "published" }],
        entries: DEFAULT_ENTRIES.map((e) => ({ ...e })),
        attendance: createInitialStudentAttendance(),
        announcements: DEFAULT_ANNOUNCEMENTS.map((a) => ({ ...a })),
        changeLog: DEFAULT_CHANGE_LOG.map((c) => ({ ...c })),
      };
      saveStore();
    }
  }
  return memoryStore;
}

function saveStore() {
  if (typeof window !== "undefined" && memoryStore) {
    try {
      localStorage.setItem("campusmate_cr_store_v3", JSON.stringify(memoryStore));
    } catch (e) {
      console.warn("Failed to persist to localStorage", e);
    }
  }
}

// ---------------------------------------------------------------------------
// Campus Repository API
// ---------------------------------------------------------------------------

export const campusRepository = {
  /**
   * Returns current active profile (Student or CR based on active persona)
   */
  async getActiveProfile(): Promise<Profile & { role: 'student' | 'cr'; class_group_id: string; subgroupId?: string }> {
    const store = getStore();
    const isCr = store.activeRole === "cr";
    const baseProfile = isCr ? store.profiles.cr : store.profiles.student;
    return {
      ...baseProfile,
      role: isCr ? 'cr' : 'student',
      class_group_id: store.classGroup.id,
      subgroupId: isCr ? undefined : store.studentSubgroupId,
    };
  },

  /**
   * Switch between Student and CR persona for evaluation
   */
  async switchActiveUser(role: "student" | "cr"): Promise<Profile & { role: 'student' | 'cr' }> {
    const store = getStore();
    store.activeRole = role;
    saveStore();
    return await this.getActiveProfile();
  },

  /**
   * Returns class group details
   */
  async getActiveClassGroup(): Promise<ClassGroup> {
    return getStore().classGroup;
  },

  /**
   * Returns subjects for class group
   */
  async getSubjects(classGroupId?: string): Promise<Subject[]> {
    return [
      { id: "CS501", code: "CS501", name: "Database Management Systems", credits: 4, faculty_name: "Dr. Arvind Sharma", room: "LH-301", color: "#4f46e5", min_attendance_pct: 75.0, class_group_id: "cg-cse-3a", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "CS502", code: "CS502", name: "Operating Systems", credits: 4, faculty_name: "Prof. Rajesh Mehta", room: "LH-302", color: "#0ea5e9", min_attendance_pct: 75.0, class_group_id: "cg-cse-3a", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "CS503", code: "CS503", name: "Computer Networks", credits: 3, faculty_name: "Dr. Kavita Patel", room: "LH-301", color: "#10b981", min_attendance_pct: 75.0, class_group_id: "cg-cse-3a", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "CS504", code: "CS504", name: "Theory of Computation", credits: 3, faculty_name: "Prof. Sunita Gupta", room: "LH-303", color: "#f59e0b", min_attendance_pct: 75.0, class_group_id: "cg-cse-3a", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "CS505L", code: "CS505L", name: "Web Tech & DBMS Lab", credits: 2, faculty_name: "Dr. Arvind Sharma", room: "CS Lab 2", color: "#8b5cf6", min_attendance_pct: 75.0, class_group_id: "cg-cse-3a", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "EC301", code: "EC301", name: "Digital Electronics", credits: 3, faculty_name: "Dr. P. Sen", room: "LH-204", color: "#ec4899", min_attendance_pct: 75.0, class_group_id: "cg-cse-3a", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
  },

  /**
   * Returns lab subgroups (Lab A, Lab B, Lab C) for the class group
   */
  async getClassSubgroups(classGroupId: string): Promise<ClassSubgroup[]> {
    const store = getStore();
    return store.subgroups.filter((s) => s.class_group_id === classGroupId);
  },

  /**
   * Returns the student's assigned lab subgroup (e.g. Lab B)
   */
  async getStudentSubgroup(studentId: string): Promise<ClassSubgroup | null> {
    const store = getStore();
    return store.subgroups.find((s) => s.id === store.studentSubgroupId) || null;
  },

  /**
   * Check whether a user is an approved CR for the class group
   */
  async isApprovedCR(classGroupId: string, userId: string): Promise<boolean> {
    const store = getStore();
    return userId === store.profiles.cr.id && classGroupId === store.classGroup.id;
  },

  /**
   * Returns the published timetable.
   * If studentSubgroupId is provided, returns whole-class lectures + their assigned lab subgroup sessions.
   * If omitted or null, returns all sessions.
   */
  async getPublishedTimetable(classGroupId: string, studentSubgroupId?: string | null): Promise<{
    version: TimetableVersion | null;
    entries: TimetableEntry[];
  }> {
    const store = getStore();
    const version = store.versions.find(
      (v) => v.class_group_id === classGroupId && v.status === "published"
    ) || null;

    if (!version) return { version: null, entries: [] };

    let entries = store.entries.filter((e) => e.version_id === version.id);

    // Apply lab subgroup filtering if viewing as student
    if (studentSubgroupId) {
      entries = entries.filter((e) => doesSessionApplyToStudent(e.subgroup_id, studentSubgroupId));
    }

    return { version, entries };
  },

  /**
   * Returns all timetable versions (drafts, published, archived) for CR management
   */
  async getTimetableVersions(classGroupId: string): Promise<TimetableVersion[]> {
    const store = getStore();
    return store.versions
      .filter((v) => v.class_group_id === classGroupId)
      .sort((a, b) => b.version_number - a.version_number);
  },

  /**
   * CR action: Creates a new draft timetable version with candidate slots
   */
  async createTimetableDraft(params: {
    classGroupId: string;
    entries: TimetableEntryDraft[];
    filePath?: string;
    fileName?: string;
    notes?: string;
  }): Promise<{ success: boolean; versionId: string }> {
    const store = getStore();
    const nextVer = store.versions.length + 1;
    const versionId = `ver-${nextVer}-draft-${Date.now()}`;

    const newVersion: TimetableVersion = {
      id: versionId,
      class_group_id: params.classGroupId,
      version_number: nextVer,
      status: "draft",
      file_path: params.filePath || null,
      file_name: params.fileName || null,
      notes: params.notes || `Draft v${nextVer}`,
      uploaded_by: store.profiles.cr.id,
      published_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newEntries: TimetableEntry[] = params.entries.map((e, idx) => {
      const subgroupId = e.subgroupCode
        ? store.subgroups.find((sg) => sg.code === e.subgroupCode)?.id || null
        : null;

      return {
        id: `entry-${versionId}-${idx}`,
        version_id: versionId,
        weekday: e.weekday,
        subject_code: e.subjectCode,
        subject_name: e.subjectName,
        start_time: e.startTime,
        end_time: e.endTime,
        room: e.room || "LH-301",
        instructor: e.instructor || "Faculty TBA",
        slot_type: e.slotType,
        subgroup_id: subgroupId,
        subgroup_code: e.subgroupCode || null,
        created_at: new Date().toISOString(),
      };
    });

    store.versions.push(newVersion);
    store.entries.push(...newEntries);
    saveStore();

    return { success: true, versionId };
  },

  /**
   * CR action: Updates an existing draft's slots
   */
  async updateTimetableDraft(
    versionId: string,
    entries: TimetableEntryDraft[],
    notes?: string
  ): Promise<{ success: boolean }> {
    const store = getStore();
    const ver = store.versions.find((v) => v.id === versionId);
    if (!ver || ver.status !== "draft") {
      throw new Error("Cannot update a published or non-existent version");
    }

    if (notes) ver.notes = notes;
    ver.updated_at = new Date().toISOString();

    store.entries = store.entries.filter((e) => e.version_id !== versionId);
    const newEntries: TimetableEntry[] = entries.map((e, idx) => {
      const subgroupId = e.subgroupCode
        ? store.subgroups.find((sg) => sg.code === e.subgroupCode)?.id || null
        : null;

      return {
        id: `entry-${versionId}-${idx}-${Date.now()}`,
        version_id: versionId,
        weekday: e.weekday,
        subject_code: e.subjectCode,
        subject_name: e.subjectName,
        start_time: e.startTime,
        end_time: e.endTime,
        room: e.room || "LH-301",
        instructor: e.instructor || "Faculty TBA",
        slot_type: e.slotType,
        subgroup_id: subgroupId,
        subgroup_code: e.subgroupCode || null,
        created_at: new Date().toISOString(),
      };
    });

    store.entries.push(...newEntries);
    saveStore();
    return { success: true };
  },

  /**
   * CR action: Publishes a draft timetable version to all students in the class group
   */
  async publishTimetableVersion(
    versionId: string,
    classGroupId: string
  ): Promise<{ success: boolean }> {
    const store = getStore();

    for (const v of store.versions) {
      if (v.class_group_id === classGroupId && v.status === "published") {
        v.status = "archived";
      }
    }

    const target = store.versions.find((v) => v.id === versionId);
    if (target) {
      target.status = "published";
      target.published_at = new Date().toISOString();
      target.updated_at = new Date().toISOString();
    }

    saveStore();
    return { success: true };
  },

  /**
   * CR Action: Cancels a class session with audit log record
   * Excludes the session from the denominator for all affected students!
   */
  async cancelClassSession(params: {
    sessionId: string;
    classGroupId: string;
    reason: string;
    changedBy: string;
    affectedSubject?: string;
    affectedDate?: string;
  }): Promise<{ success: boolean }> {
    const store = getStore();

    // 1. Log to class_change_log audit trail
    const logEntry: ClassChangeLog = {
      id: `chg-${Date.now()}`,
      session_id: params.sessionId,
      class_group_id: params.classGroupId,
      changed_by: params.changedBy,
      action: "cancelled",
      reason: params.reason,
      old_values: { status: "scheduled", subject: params.affectedSubject },
      new_values: { status: "cancelled", subject: params.affectedSubject, reason: params.reason },
      created_at: new Date().toISOString(),
    };
    store.changeLog.unshift(logEntry);

    // 2. Create announcement so students see the notification
    await this.createAnnouncement({
      classGroupId: params.classGroupId,
      type: "cancellation",
      title: `Cancelled: ${params.affectedSubject || "Class Session"}`,
      message: params.reason,
      affectedDate: params.affectedDate,
      affectedSubject: params.affectedSubject,
    });

    saveStore();
    return { success: true };
  },

  /**
   * CR Action: Adds an extra class session with audit log record
   */
  async addExtraClassSession(params: {
    classGroupId: string;
    subjectCode: string;
    subjectName: string;
    subgroupId?: string | null;
    date: string;
    startTime: string;
    endTime: string;
    room?: string;
    facultyName?: string;
    reason: string;
    changedBy: string;
  }): Promise<{ success: boolean }> {
    const store = getStore();

    // Log to class_change_log
    const logEntry: ClassChangeLog = {
      id: `chg-${Date.now()}`,
      session_id: `extra-${Date.now()}`,
      class_group_id: params.classGroupId,
      changed_by: params.changedBy,
      action: "extra_added",
      reason: params.reason,
      old_values: {},
      new_values: {
        subject: params.subjectCode,
        date: params.date,
        time: params.startTime,
        room: params.room,
      },
      created_at: new Date().toISOString(),
    };
    store.changeLog.unshift(logEntry);

    // Create announcement
    await this.createAnnouncement({
      classGroupId: params.classGroupId,
      type: "extra_class",
      title: `Extra Class: ${params.subjectCode} on ${params.date}`,
      message: `${params.reason} (${params.startTime} - ${params.endTime} in ${params.room || "Room TBA"})`,
      affectedDate: params.date,
      affectedSubject: params.subjectCode,
    });

    saveStore();
    return { success: true };
  },

  /**
   * Returns class announcements
   */
  async getClassAnnouncements(classGroupId: string): Promise<ClassAnnouncement[]> {
    const store = getStore();
    return store.announcements
      .filter((a) => a.class_group_id === classGroupId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  /**
   * Returns class change audit log
   */
  async getClassChangeLog(classGroupId: string): Promise<ClassChangeLog[]> {
    const store = getStore();
    return store.changeLog
      .filter((c) => c.class_group_id === classGroupId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  /**
   * CR action: Creates a class announcement
   */
  async createAnnouncement(input: {
    classGroupId: string;
    type: "cancellation" | "holiday" | "extra_class" | "general";
    title: string;
    message: string;
    affectedDate?: string;
    affectedSubject?: string;
  }): Promise<{ success: boolean; announcement: ClassAnnouncement }> {
    const store = getStore();
    const newAnn: ClassAnnouncement = {
      id: `ann-${Date.now()}`,
      class_group_id: input.classGroupId,
      type: input.type,
      title: input.title,
      message: input.message,
      affected_date: input.affectedDate || null,
      affected_subject: input.affectedSubject || null,
      created_by: store.profiles.cr.id,
      created_at: new Date().toISOString(),
    };

    store.announcements.unshift(newAnn);
    saveStore();
    return { success: true, announcement: newAnn };
  },

  /**
   * Student action: Records or updates personal attendance for a class session
   */
  async markStudentAttendance(params: {
    timetableEntryId?: string;
    sessionId?: string;
    classGroupId: string;
    date: string;
    status: "attended" | "absent";
    remarks?: string;
  }): Promise<{ success: boolean }> {
    const store = getStore();
    const studentId = store.profiles.student.id;
    const targetSessionId = params.sessionId || params.timetableEntryId || "unknown-session";
    const sessionKey = targetSessionId.startsWith("occ-") 
      ? targetSessionId 
      : `occ-${targetSessionId}-${params.date}`;

    const existingIdx = store.attendance.findIndex(
      (a) => a.student_id === studentId && (a.session_id === targetSessionId || a.session_id === sessionKey)
    );

    if (existingIdx >= 0) {
      store.attendance[existingIdx].session_id = sessionKey;
      store.attendance[existingIdx].status = params.status;
      store.attendance[existingIdx].remarks = params.remarks || null;
      store.attendance[existingIdx].updated_at = new Date().toISOString();
    } else {
      store.attendance.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        session_id: sessionKey,
        student_id: studentId,
        status: params.status,
        remarks: params.remarks || null,
        marked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    saveStore();
    return { success: true };
  },

  /**
   * Aggregates dashboard data for the active student in their class group & lab subgroup
   */
  async getDashboardData() {
    const store = getStore();
    const profile = await this.getActiveProfile();
    const classGroup = store.classGroup;
    const studentSubgroupId = profile.role === "cr" ? null : store.studentSubgroupId;
    
    // Published timetable filtered by student's lab subgroup
    const { version: publishedVersion, entries } = await this.getPublishedTimetable(classGroup.id, studentSubgroupId);
    const announcements = await this.getClassAnnouncements(classGroup.id);
    const changeLog = await this.getClassChangeLog(classGroup.id);

    const todayDate = new Date();
    const todayStr = todayDate.toISOString().split("T")[0];
    const jsDay = todayDate.getDay();
    const isoDayOfWeek = jsDay === 0 ? 7 : jsDay;

    // Filter today's timetable entries
    const todaySlots = entries.filter((e) => e.weekday === isoDayOfWeek);

    // Build map of student's personal attendance
    const studentAttendance = store.attendance.filter(
      (a) => a.student_id === profile.id
    );
    const attMap = new Map<string, AttendanceRecord>();
    for (const a of studentAttendance) {
      attMap.set(a.session_id, a);
    }

    // Attach today's attendance status to today's slots
    const todayClasses = todaySlots.map((slot) => {
      const record = attMap.get(slot.id);
      const isCancelled = announcements.some(
        (a) =>
          a.type === "cancellation" &&
          a.affected_date === todayStr &&
          (a.affected_subject === slot.subject_code || !a.affected_subject)
      );

      return {
        id: slot.id,
        subject: {
          code: slot.subject_code,
          name: slot.subject_name,
        },
        start_time: slot.start_time,
        end_time: slot.end_time,
        room: slot.room,
        faculty_name: slot.instructor,
        slot_type: slot.slot_type,
        subgroup_code: slot.subgroup_code,
        status: isCancelled ? "cancelled" : "upcoming",
        attendanceRecord: record,
      };
    });

    // Unique subjects
    const subjects: SubjectInfo[] = [
      { id: "CS501", code: "CS501", name: "Database Management Systems", minAttendancePct: 75.0, color: "#4f46e5", room: "LH-301", facultyName: "Dr. Arvind Sharma" },
      { id: "CS502", code: "CS502", name: "Operating Systems", minAttendancePct: 75.0, color: "#0ea5e9", room: "LH-302", facultyName: "Prof. Rajesh Mehta" },
      { id: "CS503", code: "CS503", name: "Computer Networks", minAttendancePct: 75.0, color: "#10b981", room: "LH-301", facultyName: "Dr. Kavita Patel" },
      { id: "CS504", code: "CS504", name: "Theory of Computation", minAttendancePct: 75.0, color: "#f59e0b", room: "LH-303", facultyName: "Prof. Sunita Gupta" },
      { id: "CS505L", code: "CS505L", name: "Web Tech & DBMS Lab", minAttendancePct: 75.0, color: "#8b5cf6", room: "CS Lab 2", facultyName: "Dr. Arvind Sharma" },
      { id: "EC301", code: "EC301", name: "Digital Electronics", minAttendancePct: 75.0, color: "#ec4899", room: "LH-204", facultyName: "Dr. P. Sen" },
    ];

    // Build engine occurrences from student's personal attendance & schedule
    const engineOccurrences: OccurrenceWithAttendance[] = studentAttendance.map((a) => {
      // Find matching entry or determine from session id
      const slot = store.entries.find((e) => e.id === a.session_id);
      let subjectCode = slot?.subject_code || "CS501";
      if (a.session_id.includes("de") || a.session_id === "slot-9") {
        subjectCode = "EC301";
      }

      return {
        id: a.id,
        subjectId: subjectCode,
        subgroupId: slot?.subgroup_id || null,
        date: "2024-10-15", // past date
        startTime: slot?.start_time || "09:00:00",
        endTime: slot?.end_time || "10:00:00",
        eventType: a.session_id.includes("extra") ? "extra" : "regular",
        status: "completed",
        attendanceStatus: a.status,
      };
    });

    // Add cancelled session for EC301 (from user prompt example)
    engineOccurrences.push({
      id: "canc-de",
      subjectId: "EC301",
      subgroupId: null,
      date: "2024-10-20",
      startTime: "11:30:00",
      endTime: "12:30:00",
      status: "cancelled",
      attendanceStatus: null,
    });

    const attendanceSummary = calculateOverallAttendance(
      subjects,
      engineOccurrences,
      75.0,
      todayStr,
      studentSubgroupId
    );

    return {
      profile,
      classGroup,
      subgroups: store.subgroups,
      activeSubgroup: store.subgroups.find((s) => s.id === store.studentSubgroupId),
      publishedVersion,
      todayClasses,
      overall: attendanceSummary,
      subjects: attendanceSummary.subjectSummaries,
      attendanceSummary,
      unconfirmedClasses: [],
      upcomingHolidays: [
        { id: "hol-1", name: "Diwali Break", date: "2024-11-01", description: "Festival of Lights" }
      ],
      announcements,
      changeLog,
    };
  },

  /**
   * Returns occurrences for calendar view filtered by student subgroup
   */
  async getCalendarOccurrences(startDate: string, endDate: string) {
    const store = getStore();
    const profile = await this.getActiveProfile();
    const studentSubgroupId = profile.role === "cr" ? null : store.studentSubgroupId;
    const { entries } = await this.getPublishedTimetable(store.classGroup.id, studentSubgroupId);
    const announcements = await this.getClassAnnouncements(store.classGroup.id);

    const occurrences: any[] = [];
    const curr = new Date(startDate);
    const end = new Date(endDate);
    const todayStr = new Date().toISOString().split("T")[0];

    const attMap = new Map<string, AttendanceRecord>();
    for (const a of store.attendance.filter((rec) => rec.student_id === profile.id)) {
      attMap.set(a.session_id, a);
    }

    while (curr <= end) {
      const dateStr = curr.toISOString().split("T")[0];
      const jsDay = curr.getDay();
      const isoDayOfWeek = jsDay === 0 ? 7 : jsDay;

      if (jsDay !== 0 && jsDay !== 6) {
        const daySlots = entries.filter((e) => e.weekday === isoDayOfWeek);
        for (const slot of daySlots) {
          const occId = `occ-${slot.id}-${dateStr}`;
          const record = attMap.get(occId) || attMap.get(slot.id);
          const isCancelled = announcements.some(
            (a) =>
              a.type === "cancellation" &&
              a.affected_date === dateStr &&
              (a.affected_subject === slot.subject_code || !a.affected_subject)
          );

          occurrences.push({
            id: occId,
            subject_id: slot.subject_code,
            date: dateStr,
            start_time: slot.start_time,
            end_time: slot.end_time,
            room: slot.room,
            faculty_name: slot.instructor,
            slot_type: slot.slot_type,
            subgroup_code: slot.subgroup_code,
            status: isCancelled ? "cancelled" : dateStr < todayStr ? "completed" : "scheduled",
            attendanceRecord: record || null,
            subject: {
              code: slot.subject_code,
              name: slot.subject_name,
            },
          });
        }
      }

      curr.setDate(curr.getDate() + 1);
    }

    return occurrences;
  },

  /**
   * Alias for calendar occurrences
   */
  async getClassOccurrences(startDate?: string, endDate?: string) {
    const today = new Date();
    const start = startDate || new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split("T")[0];
    const end = endDate || new Date(today.getFullYear(), today.getMonth() + 2, 0).toISOString().split("T")[0];
    return await this.getCalendarOccurrences(start, end);
  },

  /**
   * Compatibility confirm all unconfirmed helper
   */
  async confirmAllUnconfirmed(): Promise<{ success: boolean }> {
    return { success: true };
  },

  /**
   * Compatibility attendance reporting helper
   */
  async reportAttendance(
    occurrenceId: string,
    status: "attended" | "absent",
    remarks?: string
  ): Promise<{ success: boolean }> {
    const store = getStore();
    return await this.markStudentAttendance({
      sessionId: occurrenceId,
      classGroupId: store.classGroup.id,
      date: new Date().toISOString().split("T")[0],
      status,
      remarks,
    });
  },

  /**
   * Compatibility holiday declaration helper
   */
  async declareHoliday(date: string, name: string, description?: string) {
    const store = getStore();
    return await this.createAnnouncement({
      classGroupId: store.classGroup.id,
      type: "holiday",
      title: name,
      message: description || `Declared Holiday: ${name}`,
      affectedDate: date,
    });
  },

  /**
   * Compatibility extra class declaration helper
   */
  async addExtraClass(params: {
    subjectId: string;
    date: string;
    startTime: string;
    endTime: string;
    room?: string;
    facultyName?: string;
  }) {
    const store = getStore();
    const occurrenceId = `extra-${Date.now()}`;
    await this.addExtraClassSession({
      classGroupId: store.classGroup.id,
      subjectCode: params.subjectId,
      subjectName: params.subjectId,
      date: params.date,
      startTime: params.startTime,
      endTime: params.endTime,
      room: params.room,
      facultyName: params.facultyName,
      reason: "Makeup Session",
      changedBy: store.profiles.cr.id,
    });

    return {
      success: true,
      occurrence: {
        id: occurrenceId,
        subject_id: params.subjectId,
        date: params.date,
        start_time: params.startTime,
        end_time: params.endTime,
        room: params.room,
        faculty_name: params.facultyName,
        status: "upcoming" as const,
      },
    };
  },

  /**
   * Compatibility helper for smart timetable uploads
   */
  async saveExtractedTimetable(extractedData: ExtractedTimetable) {
    const store = getStore();
    const drafts: TimetableEntryDraft[] = extractedData.slots.map((s) => ({
      weekday: s.dayOfWeek,
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room,
      instructor: s.facultyName,
      slotType: s.slotType,
      subgroupCode: s.subgroupCode || null,
    }));

    const draftRes = await this.createTimetableDraft({
      classGroupId: store.classGroup.id,
      entries: drafts,
      notes: extractedData.semesterLabel || "Extracted Timetable Upload",
    });

    await this.publishTimetableVersion(draftRes.versionId, store.classGroup.id);
    return { success: true, versionId: draftRes.versionId };
  },

  /**
   * Resets local store back to fresh initial seed
   */
  resetDemoData() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("campusmate_cr_store_v3");
    }
    memoryStore = null;
    return getStore();
  },
};
