import {
  SubjectAttendanceSummary,
  OverallAttendanceSummary,
  BunkSimulationResult,
  BunkSimulationImpact
} from "../types/attendance.types";

/**
 * Pure calculation engine for CampusMate Attendance.
 * Fully decoupled and rigorously testable.
 * Implements the CampusMate v3 attendance policy:
 * - Attendance % = present sessions ÷ held sessions × 100
 * - Held sessions = attended + absent (where class actually happened and was marked)
 * - Canceled, holidays, future scheduled, and pending sessions are strictly excluded from the held denominator
 * - Lab subgroup isolation: student only counts sessions matching their lab subgroup + whole-class lectures
 */

export interface OccurrenceWithAttendance {
  id: string;
  subjectId: string;
  subgroupId?: string | null; // NULL for whole class, or specific lab group id
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  eventType?: 'regular' | 'extra' | 'rescheduled';
  status: 'scheduled' | 'completed' | 'cancelled' | 'holiday';
  attendanceStatus?: 'unconfirmed' | 'unmarked' | 'attended' | 'absent' | null;
}

export interface SubjectInfo {
  id: string;
  code: string;
  name: string;
  color?: string;
  facultyName?: string | null;
  room?: string | null;
  minAttendancePct?: number;
}

/**
 * Checks whether a given class session applies to a student based on subgroup.
 * Whole-class sessions (subgroupId is null/undefined) apply to everyone.
 * Subgroup sessions apply only if they match the student's assigned subgroup.
 */
export function doesSessionApplyToStudent(
  sessionSubgroupId: string | null | undefined,
  studentSubgroupId: string | null | undefined
): boolean {
  if (!sessionSubgroupId) return true; // Whole-class session (e.g. Lecture)
  if (!studentSubgroupId) return true; // If student subgroup not specified, show all
  return sessionSubgroupId === studentSubgroupId;
}

/**
 * Calculates attendance metrics for a single subject from its sessions.
 */
export function calculateSubjectAttendance(
  subject: SubjectInfo,
  occurrences: OccurrenceWithAttendance[],
  targetPercentage: number = 75.0,
  referenceDate: string = new Date().toISOString().split('T')[0],
  studentSubgroupId: string | null = null
): SubjectAttendanceSummary {
  let classesAttended = 0;
  let classesAbsent = 0;
  let classesPending = 0;
  let classesCancelled = 0;
  let classesHoliday = 0;
  let classesScheduled = 0;

  for (const occ of occurrences) {
    if (occ.subjectId !== subject.id) continue;

    // Filter by student's lab subgroup
    if (!doesSessionApplyToStudent(occ.subgroupId, studentSubgroupId)) {
      continue;
    }

    // Rule 1: Canceled sessions do NOT count for held or absences
    if (occ.status === 'cancelled') {
      classesCancelled++;
      continue;
    }

    // Rule 2: Holiday / No Class sessions do NOT count
    if (occ.status === 'holiday') {
      classesHoliday++;
      continue;
    }

    const isPastOrToday = occ.date <= referenceDate;
    const attStatus = occ.attendanceStatus;

    if (attStatus === 'attended') {
      // Attended: counts as present and held
      classesAttended++;
    } else if (attStatus === 'absent') {
      // Bunked/Absent: counts as absent and held
      classesAbsent++;
    } else if (isPastOrToday && occ.status === 'completed') {
      // Completed in reality, but student hasn't entered attendance yet
      classesPending++;
    } else if (isPastOrToday && (!attStatus || attStatus === 'unconfirmed' || attStatus === 'unmarked')) {
      // Class happened or today, attendance pending
      classesPending++;
    } else {
      // Future scheduled class: planned but hasn't happened yet -> not counted yet
      classesScheduled++;
    }
  }

  // Held sessions = attended + absent (only classes that actually took place and for which attendance was recorded)
  const classesHeld = classesAttended + classesAbsent;

  // Attendance % = attended sessions ÷ held sessions × 100
  const attendancePercentage = classesHeld > 0 
    ? Math.round(((classesAttended / classesHeld) * 100) * 100) / 100 
    : 100.0;

  // Provisional Percentage: Assuming all currently pending sessions will be attended
  const provisionalDenom = classesHeld + classesPending;
  const provisionalPercentage = provisionalDenom > 0
    ? Math.round((((classesAttended + classesPending) / provisionalDenom) * 100) * 100) / 100
    : 100.0;

  // Target & Recovery Planning
  const target = subject.minAttendancePct ?? targetPercentage;
  const isAboveTarget = attendancePercentage >= target;

  let classesNeededForTarget = 0;
  let maxBunkableClasses = 0;

  if (target >= 100) {
    if (classesAbsent > 0) {
      classesNeededForTarget = 999;
      maxBunkableClasses = 0;
    } else {
      classesNeededForTarget = 0;
      maxBunkableClasses = 0;
    }
  } else if (!isAboveTarget) {
    // Formula: ceil((target * held - 100 * attended) / (100 - target))
    const numerator = (target * classesHeld) - (100 * classesAttended);
    const denominator = 100 - target;
    classesNeededForTarget = Math.max(0, Math.ceil(numerator / denominator));
    maxBunkableClasses = 0;
  } else {
    // Formula: floor((100 * attended - target * held) / target)
    const numerator = (100 * classesAttended) - (target * classesHeld);
    maxBunkableClasses = Math.max(0, Math.floor(numerator / target));
    classesNeededForTarget = 0;
  }

  let statusTag: 'safe' | 'warning' | 'critical' = 'safe';
  if (attendancePercentage < target) {
    statusTag = 'critical';
  } else if (attendancePercentage <= target + 5.0) {
    statusTag = 'warning';
  }

  return {
    subjectId: subject.id,
    subjectCode: subject.code,
    subjectName: subject.name,
    color: subject.color || '#4f46e5',
    facultyName: subject.facultyName,
    room: subject.room,
    targetPercentage: target,
    
    classesHeld,
    classesConducted: classesHeld, // alias
    classesAttended,
    classesAbsent,
    classesPending,
    classesUnconfirmed: classesPending, // alias
    classesCancelled,
    classesHoliday,
    classesScheduled,
    
    attendancePercentage,
    provisionalPercentage,
    hasPending: classesPending > 0,
    isAboveTarget,
    classesNeededForTarget,
    maxBunkableClasses,
    statusTag,
  };
}

/**
 * Calculates overall attendance summary across all subjects.
 * Formula: Overall % = total attended sessions ÷ total held sessions × 100
 */
export function calculateOverallAttendance(
  subjects: SubjectInfo[],
  occurrences: OccurrenceWithAttendance[],
  targetPercentage: number = 75.0,
  referenceDate: string = new Date().toISOString().split('T')[0],
  studentSubgroupId: string | null = null
): OverallAttendanceSummary {
  const subjectSummaries = subjects.map((sub) =>
    calculateSubjectAttendance(sub, occurrences, targetPercentage, referenceDate, studentSubgroupId)
  );

  let totalHeld = 0;
  let totalAttended = 0;
  let totalAbsent = 0;
  let totalPending = 0;
  let totalCancelled = 0;
  let totalHoliday = 0;

  for (const s of subjectSummaries) {
    totalHeld += s.classesHeld;
    totalAttended += s.classesAttended;
    totalAbsent += s.classesAbsent;
    totalPending += s.classesPending;
    totalCancelled += s.classesCancelled;
    totalHoliday += s.classesHoliday;
  }

  const overallPercentage = totalHeld > 0 
    ? Math.round(((totalAttended / totalHeld) * 100) * 100) / 100 
    : 100.0;

  return {
    totalHeld,
    totalConducted: totalHeld,
    totalAttended,
    totalAbsent,
    totalPending,
    totalUnconfirmed: totalPending,
    totalCancelled,
    totalHoliday,
    overallPercentage,
    targetPercentage,
    isAboveTarget: overallPercentage >= targetPercentage,
    unconfirmedCount: totalPending,
    subjectSummaries,
  };
}

/**
 * Bunk Simulation:
 * Simulates the exact impact on attendance if the student skips all classes on targetDate.
 * Supports both call signatures:
 * - (targetDate, subjects, occurrences, targetPercentage)
 * - (subjects, occurrences, targetDate, targetPercentage)
 */
export function simulateBunkOnDate(
  arg1: string | SubjectInfo[],
  arg2: SubjectInfo[] | OccurrenceWithAttendance[],
  arg3?: OccurrenceWithAttendance[] | string,
  arg4: number = 75.0,
  arg5: string | null = null
): BunkSimulationResult {
  let subjects: SubjectInfo[];
  let allOccurrences: OccurrenceWithAttendance[];
  let targetDate: string;
  let targetPercentage: number;
  let studentSubgroupId: string | null;

  if (typeof arg1 === "string") {
    // Signature: (targetDate, subjects, occurrences, targetPercentage?, studentSubgroupId?)
    targetDate = arg1;
    subjects = arg2 as SubjectInfo[];
    allOccurrences = (arg3 as OccurrenceWithAttendance[]) || [];
    targetPercentage = arg4 ?? 75.0;
    studentSubgroupId = arg5 ?? null;
  } else {
    // Signature: (subjects, occurrences, targetDate, targetPercentage?, studentSubgroupId?)
    subjects = arg1;
    allOccurrences = (arg2 as OccurrenceWithAttendance[]) || [];
    targetDate = typeof arg3 === "string" ? arg3 : new Date().toISOString().split("T")[0];
    targetPercentage = arg4 ?? 75.0;
    studentSubgroupId = arg5 ?? null;
  }
  const currentOverall = calculateOverallAttendance(subjects, allOccurrences, targetPercentage, targetDate, studentSubgroupId);

  const targetDateOccurrences = allOccurrences.filter(
    (occ) => occ.date === targetDate && 
             occ.status !== 'cancelled' && 
             occ.status !== 'holiday' &&
             doesSessionApplyToStudent(occ.subgroupId, studentSubgroupId)
  );

  if (targetDateOccurrences.length === 0) {
    return {
      date: targetDate,
      totalClassesOnDate: 0,
      subjectsAffected: [],
      overallCurrentPercentage: currentOverall.overallPercentage,
      overallProjectedPercentage: currentOverall.overallPercentage,
      canSafelyBunk: true,
      summaryMessage: `No classes scheduled on ${targetDate}. Safe to take off!`,
    };
  }

  // Create simulated copy of occurrences where classes on targetDate are marked absent
  const simulatedOccurrences: OccurrenceWithAttendance[] = allOccurrences.map((occ) => {
    if (occ.date === targetDate && occ.status !== 'cancelled' && occ.status !== 'holiday') {
      return {
        ...occ,
        status: 'completed',
        attendanceStatus: 'absent',
      };
    }
    return occ;
  });

  const simulatedOverall = calculateOverallAttendance(
    subjects,
    simulatedOccurrences,
    targetPercentage,
    targetDate,
    studentSubgroupId
  );

  const subjectsAffected: BunkSimulationImpact[] = [];
  let allSubjectsSafe = true;

  for (const sub of subjects) {
    const classesOnDate = targetDateOccurrences.filter((o) => o.subjectId === sub.id).length;
    if (classesOnDate === 0) continue;

    const currSub = currentOverall.subjectSummaries.find((s) => s.subjectId === sub.id)!;
    const simSub = simulatedOverall.subjectSummaries.find((s) => s.subjectId === sub.id)!;

    if (!simSub.isAboveTarget) {
      allSubjectsSafe = false;
    }

    subjectsAffected.push({
      subjectId: sub.id,
      subjectCode: sub.code,
      subjectName: sub.name,
      currentPercentage: currSub.attendancePercentage,
      projectedPercentage: simSub.attendancePercentage,
      projectedAttended: simSub.classesAttended,
      projectedConducted: simSub.classesHeld,
      isAboveTargetBefore: currSub.isAboveTarget,
      isAboveTargetAfter: simSub.isAboveTarget,
      recoveryClassesNeeded: simSub.classesNeededForTarget,
      classesScheduledOnDate: classesOnDate,
    });
  }

  const canSafelyBunk = simulatedOverall.isAboveTarget && allSubjectsSafe;

  const summaryMessage = canSafelyBunk
    ? `Safe to bunk on ${targetDate}. Overall attendance will be ${simulatedOverall.overallPercentage}%, remaining above target.`
    : `Warning: Bunking on ${targetDate} will drop overall attendance to ${simulatedOverall.overallPercentage}%, falling below your target of ${targetPercentage}%.`;

  return {
    date: targetDate,
    totalClassesOnDate: targetDateOccurrences.length,
    subjectsAffected,
    overallCurrentPercentage: currentOverall.overallPercentage,
    overallProjectedPercentage: simulatedOverall.overallPercentage,
    canSafelyBunk,
    summaryMessage,
  };
}
