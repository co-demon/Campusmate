import {
  TimetableEntry,
  ClassOccurrence,
  Holiday,
  AttendanceRecord,
  SessionStatus
} from "../types/timetable.types";

export interface GenerateCalendarParams {
  userId?: string;
  classGroupId?: string;
  semesterId?: string;
  timetableEntries: TimetableEntry[];
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  holidays?: Holiday[];
  existingOccurrences?: ClassOccurrence[];
  existingAttendanceRecords?: AttendanceRecord[];
}

export interface GeneratedOccurrencePayload {
  userId?: string;
  classGroupId?: string;
  semesterId?: string;
  subjectId: string;
  subgroupId?: string | null;
  subgroupCode?: string | null;
  timetableEntryId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  room: string | null;
  facultyName: string | null;
  eventType: 'regular' | 'extra' | 'rescheduled';
  status: SessionStatus;
  cancellationReason?: string | null;
}

/**
 * Converts a Date object to YYYY-MM-DD string consistently.
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Generates all scheduled class occurrences for a semester.
 * Strictly prevents duplicates and preserves existing recorded attendance.
 */
export function generateSemesterClassOccurrences(
  params: GenerateCalendarParams
): { newOccurrences: GeneratedOccurrencePayload[]; skippedCount: number } {
  const {
    userId,
    classGroupId,
    semesterId,
    timetableEntries,
    startDate,
    endDate,
    holidays = [],
    existingOccurrences = []
  } = params;

  // Build a lookup set of existing occurrences: "subjectId|subgroupId|date|startTime"
  const existingMap = new Set<string>();
  for (const occ of existingOccurrences) {
    existingMap.add(`${occ.subject_id}|${occ.subgroup_id || ''}|${occ.date}|${occ.start_time}`);
  }

  // Build a map of holidays by date
  const holidayMap = new Map<string, Holiday>();
  for (const h of holidays) {
    if (h.applies_to_all) {
      holidayMap.set(h.date, h);
    }
  }

  const newOccurrences: GeneratedOccurrencePayload[] = [];
  let skippedCount = 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);

  while (current <= end) {
    const dateStr = formatDate(current);
    // JavaScript getDay(): 0=Sunday, 1=Monday ... 6=Saturday
    // Our schema: 1=Monday, 2=Tuesday ... 7=Sunday
    const jsDay = current.getDay();
    const isoDayOfWeek = jsDay === 0 ? 7 : jsDay;

    // Find timetable entries for this day
    const dayEntries = timetableEntries.filter(
      e => (e.day_of_week === isoDayOfWeek || e.weekday === isoDayOfWeek) && e.is_active !== false
    );

    const isHoliday = holidayMap.has(dateStr);
    const holidayInfo = holidayMap.get(dateStr);

    for (const entry of dayEntries) {
      const subId = entry.subject_id || entry.subject_code || "SUB";
      const subgroupId = entry.subgroup_id || null;
      const uniqueKey = `${subId}|${subgroupId || ''}|${dateStr}|${entry.start_time}`;

      if (existingMap.has(uniqueKey)) {
        skippedCount++;
        continue; // Prevent duplicate occurrence
      }

      newOccurrences.push({
        userId,
        classGroupId,
        semesterId,
        subjectId: subId,
        subgroupId,
        subgroupCode: entry.subgroup_code || null,
        timetableEntryId: entry.id,
        date: dateStr,
        startTime: entry.start_time,
        endTime: entry.end_time,
        room: entry.room || null,
        facultyName: entry.faculty_name || entry.instructor || null,
        eventType: 'regular',
        status: isHoliday ? 'cancelled' : 'scheduled',
        cancellationReason: isHoliday ? `Holiday: ${holidayInfo?.name || 'College Holiday'}` : null,
      });

      existingMap.add(uniqueKey);
    }

    current.setDate(current.getDate() + 1);
  }

  return { newOccurrences, skippedCount };
}

/**
 * Declares a holiday on a specific date, cancelling all scheduled classes on that date
 * without destroying their attendance history or counting as student absences.
 */
export function applyHolidayCancellation(
  date: string,
  holidayName: string,
  occurrences: ClassOccurrence[]
): { updatedOccurrences: ClassOccurrence[]; cancelledCount: number } {
  let cancelledCount = 0;
  const updatedOccurrences = occurrences.map(occ => {
    if (occ.date === date && occ.status !== 'cancelled') {
      cancelledCount++;
      return {
        ...occ,
        status: 'cancelled' as const,
        cancellation_reason: `Holiday: ${holidayName}`,
      };
    }
    return occ;
  });

  return { updatedOccurrences, cancelledCount };
}
