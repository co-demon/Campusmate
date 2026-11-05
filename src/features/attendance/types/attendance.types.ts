export type AttendanceStatus = 'scheduled' | 'pending' | 'attended' | 'absent' | 'cancelled' | 'holiday';

export interface SubjectAttendanceSummary {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  color: string;
  facultyName?: string | null;
  room?: string | null;
  targetPercentage: number;
  
  // Counts based on actual sessions held
  classesHeld: number;        // Only classes that actually occurred and were marked (attended + absent)
  classesConducted: number;   // Backward compatibility alias for classesHeld
  classesAttended: number;    // Present
  classesAbsent: number;      // Bunked / Absent
  classesPending: number;     // Happened, but student has not recorded attendance yet
  classesUnconfirmed: number; // Backward compatibility alias for classesPending
  classesCancelled: number;   // Cancelled sessions (excluded from held)
  classesHoliday: number;     // Holidays / No class (excluded from held)
  classesScheduled: number;   // Future planned sessions (not counted yet)
  
  // Calculations
  attendancePercentage: number; // (classesAttended / classesHeld) * 100
  provisionalPercentage: number; // If pending sessions were marked attended
  
  // Status flags
  hasPending: boolean;
  isAboveTarget: boolean;
  classesNeededForTarget: number; // Extra classes needed to hit target
  maxBunkableClasses: number;     // Classes student can safely bunk without dropping below target
  
  statusTag: 'safe' | 'warning' | 'critical';
}

export interface OverallAttendanceSummary {
  totalHeld: number;          // Total classes actually held & marked
  totalConducted: number;     // Alias for totalHeld
  totalAttended: number;      // Total attended
  totalAbsent: number;        // Total bunked
  totalPending: number;       // Pending / unmarked sessions
  totalUnconfirmed: number;   // Alias for totalPending
  totalCancelled: number;     // Excluded
  totalHoliday: number;       // Excluded
  overallPercentage: number;  // (totalAttended / totalHeld) * 100
  targetPercentage: number;
  isAboveTarget: boolean;
  unconfirmedCount: number;
  subjectSummaries: SubjectAttendanceSummary[];
}

export interface BunkSimulationInput {
  targetDate: string; // YYYY-MM-DD
  userTargetPercentage?: number;
  studentSubgroupId?: string | null;
}

export interface BunkSimulationImpact {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  currentPercentage: number;
  projectedPercentage: number;
  projectedAttended: number;
  projectedConducted: number;
  isAboveTargetBefore: boolean;
  isAboveTargetAfter: boolean;
  recoveryClassesNeeded: number;
  classesScheduledOnDate: number;
}

export interface BunkSimulationResult {
  date: string;
  totalClassesOnDate: number;
  subjectsAffected: BunkSimulationImpact[];
  overallCurrentPercentage: number;
  overallProjectedPercentage: number;
  canSafelyBunk: boolean;
  summaryMessage: string;
}
