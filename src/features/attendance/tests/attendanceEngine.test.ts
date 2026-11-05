import { describe, it, expect } from "vitest";
import {
  calculateSubjectAttendance,
  calculateOverallAttendance,
  simulateBunkOnDate,
  OccurrenceWithAttendance,
  SubjectInfo,
} from "../services/attendanceEngine";

describe("CampusMate v3 Attendance Calculation Engine", () => {
  const dummySubject: SubjectInfo = {
    id: "sub-1",
    code: "CS501",
    name: "Database Management Systems",
    minAttendancePct: 75.0,
  };

  const digitalElectronics: SubjectInfo = {
    id: "sub-de",
    code: "EC301",
    name: "Digital Electronics",
    minAttendancePct: 75.0,
  };

  it("calculates basic attendance percentage correctly", () => {
    const occurrences: OccurrenceWithAttendance[] = [
      { id: "1", subjectId: "sub-1", date: "2024-09-01", startTime: "09:00:00", endTime: "10:00:00", eventType: "regular", status: "completed", attendanceStatus: "attended" },
      { id: "2", subjectId: "sub-1", date: "2024-09-02", startTime: "09:00:00", endTime: "10:00:00", eventType: "regular", status: "completed", attendanceStatus: "attended" },
      { id: "3", subjectId: "sub-1", date: "2024-09-03", startTime: "09:00:00", endTime: "10:00:00", eventType: "regular", status: "completed", attendanceStatus: "absent" },
      { id: "4", subjectId: "sub-1", date: "2024-09-04", startTime: "09:00:00", endTime: "10:00:00", eventType: "regular", status: "completed", attendanceStatus: "attended" },
    ];

    const result = calculateSubjectAttendance(dummySubject, occurrences, 75.0, "2024-09-10");
    // 3 attended out of 4 held = 75%
    expect(result.classesHeld).toBe(4);
    expect(result.classesAttended).toBe(3);
    expect(result.classesAbsent).toBe(1);
    expect(result.attendancePercentage).toBe(75.0);
    expect(result.isAboveTarget).toBe(true);
    expect(result.classesNeededForTarget).toBe(0);
    expect(result.maxBunkableClasses).toBe(0);
  });

  it("verifies the exact Digital Electronics example: 8 attended, 2 bunked, 1 canceled, 1 extra class attended = 81.82%", () => {
    const occurrences: OccurrenceWithAttendance[] = [
      // 8 regular attended
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `att-${i}`,
        subjectId: "sub-de",
        date: `2024-09-${String(i + 1).padStart(2, "0")}`,
        startTime: "09:00:00",
        endTime: "10:00:00",
        eventType: "regular" as const,
        status: "completed" as const,
        attendanceStatus: "attended" as const,
      })),
      // 2 bunked (absent)
      { id: "bunk-1", subjectId: "sub-de", date: "2024-09-10", startTime: "09:00:00", endTime: "10:00:00", eventType: "regular", status: "completed", attendanceStatus: "absent" },
      { id: "bunk-2", subjectId: "sub-de", date: "2024-09-11", startTime: "09:00:00", endTime: "10:00:00", eventType: "regular", status: "completed", attendanceStatus: "absent" },
      // 1 canceled class (should be excluded)
      { id: "canc-1", subjectId: "sub-de", date: "2024-09-12", startTime: "09:00:00", endTime: "10:00:00", eventType: "regular", status: "cancelled" },
      // 1 extra class attended
      { id: "extra-1", subjectId: "sub-de", date: "2024-09-13", startTime: "14:00:00", endTime: "15:00:00", eventType: "extra", status: "completed", attendanceStatus: "attended" },
    ];

    const result = calculateSubjectAttendance(digitalElectronics, occurrences, 75.0, "2024-09-20");
    
    // Held = 8 attended + 2 bunked + 1 extra attended = 11
    expect(result.classesHeld).toBe(11);
    expect(result.classesAttended).toBe(9); // 8 regular + 1 extra
    expect(result.classesAbsent).toBe(2);
    expect(result.classesCancelled).toBe(1);
    
    // Attendance = 9 / 11 * 100 = 81.82%
    expect(result.attendancePercentage).toBe(81.82);
    expect(result.isAboveTarget).toBe(true);
  });

  it("strictly filters sessions based on student lab subgroup", () => {
    const labSubject: SubjectInfo = {
      id: "sub-lab",
      code: "CS505L",
      name: "DBMS Lab",
      minAttendancePct: 75.0,
    };

    const occurrences: OccurrenceWithAttendance[] = [
      // Whole class lecture (no subgroup)
      { id: "lec-1", subjectId: "sub-lab", subgroupId: null, date: "2024-09-01", startTime: "09:00:00", endTime: "10:00:00", status: "completed", attendanceStatus: "attended" },
      // Lab A session (student in Lab B should NOT have this counted)
      { id: "lab-a-1", subjectId: "sub-lab", subgroupId: "subgroup-lab-a", date: "2024-09-02", startTime: "14:00:00", endTime: "16:00:00", status: "completed", attendanceStatus: "absent" },
      // Lab B session (student in Lab B MUST have this counted)
      { id: "lab-b-1", subjectId: "sub-lab", subgroupId: "subgroup-lab-b", date: "2024-09-03", startTime: "14:00:00", endTime: "16:00:00", status: "completed", attendanceStatus: "attended" },
    ];

    // Student belongs to Lab B
    const resultLabB = calculateSubjectAttendance(labSubject, occurrences, 75.0, "2024-09-10", "subgroup-lab-b");
    // Should count 1 lecture + 1 Lab B session = 2 held, 2 attended = 100%
    expect(resultLabB.classesHeld).toBe(2);
    expect(resultLabB.classesAttended).toBe(2);
    expect(resultLabB.classesAbsent).toBe(0);
    expect(resultLabB.attendancePercentage).toBe(100.0);

    // Student belongs to Lab A
    const resultLabA = calculateSubjectAttendance(labSubject, occurrences, 75.0, "2024-09-10", "subgroup-lab-a");
    // Should count 1 lecture + 1 Lab A session = 2 held, 1 attended, 1 absent = 50%
    expect(resultLabA.classesHeld).toBe(2);
    expect(resultLabA.classesAttended).toBe(1);
    expect(resultLabA.classesAbsent).toBe(1);
    expect(resultLabA.attendancePercentage).toBe(50.0);
  });

  it("excludes pending/unmarked sessions from held denominator and flags pending count", () => {
    const occurrences: OccurrenceWithAttendance[] = [
      { id: "1", subjectId: "sub-1", date: "2024-09-01", startTime: "09:00:00", endTime: "10:00:00", status: "completed", attendanceStatus: "attended" },
      // Past session that was not marked yet
      { id: "2", subjectId: "sub-1", date: "2024-09-02", startTime: "09:00:00", endTime: "10:00:00", status: "completed", attendanceStatus: "unmarked" },
    ];

    const result = calculateSubjectAttendance(dummySubject, occurrences, 75.0, "2024-09-10");
    // Only 1 held (the attended one). The unmarked one is pending, not held!
    expect(result.classesHeld).toBe(1);
    expect(result.classesAttended).toBe(1);
    expect(result.classesPending).toBe(1);
    expect(result.hasPending).toBe(true);
    expect(result.attendancePercentage).toBe(100.0);
  });

  it("calculates overall percentage across all subjects without averaging percentages", () => {
    const sub1: SubjectInfo = { id: "sub-1", code: "CS501", name: "DBMS", minAttendancePct: 75.0 };
    const sub2: SubjectInfo = { id: "sub-2", code: "CS502", name: "OS", minAttendancePct: 75.0 };

    const occurrences: OccurrenceWithAttendance[] = [
      // Sub 1: 1 attended out of 1 held = 100%
      { id: "1", subjectId: "sub-1", date: "2024-09-01", startTime: "09:00:00", endTime: "10:00:00", status: "completed", attendanceStatus: "attended" },
      // Sub 2: 1 attended out of 3 held = 33.33%
      { id: "2", subjectId: "sub-2", date: "2024-09-01", startTime: "10:00:00", endTime: "11:00:00", status: "completed", attendanceStatus: "attended" },
      { id: "3", subjectId: "sub-2", date: "2024-09-02", startTime: "10:00:00", endTime: "11:00:00", status: "completed", attendanceStatus: "absent" },
      { id: "4", subjectId: "sub-2", date: "2024-09-03", startTime: "10:00:00", endTime: "11:00:00", status: "completed", attendanceStatus: "absent" },
    ];

    const overall = calculateOverallAttendance([sub1, sub2], occurrences, 75.0, "2024-09-10");
    // Total attended = 1 + 1 = 2
    // Total held = 1 + 3 = 4
    // Overall % = 2 / 4 * 100 = 50.0% (not average of 100% and 33.33% which would be 66.67%)
    expect(overall.totalAttended).toBe(2);
    expect(overall.totalHeld).toBe(4);
    expect(overall.overallPercentage).toBe(50.0);
  });

  it("simulates bunking on a future date accurately", () => {
    const occurrences: OccurrenceWithAttendance[] = [
      ...Array.from({ length: 9 }, (_, i) => ({
        id: `occ-${i}`,
        subjectId: "sub-1",
        date: `2024-09-${String(i + 1).padStart(2, "0")}`,
        startTime: "09:00:00",
        endTime: "10:00:00",
        status: "completed" as const,
        attendanceStatus: "attended" as const,
      })),
      // Class scheduled on target date
      { id: "target-1", subjectId: "sub-1", date: "2024-09-25", startTime: "09:00:00", endTime: "10:00:00", status: "scheduled", attendanceStatus: null }
    ];

    const simulation = simulateBunkOnDate([dummySubject], occurrences, "2024-09-25", 75.0);
    expect(simulation.totalClassesOnDate).toBe(1);
    // Currently 9/9 = 100%
    expect(simulation.overallCurrentPercentage).toBe(100.0);
    // After bunking 1 class: 9/10 = 90%
    expect(simulation.overallProjectedPercentage).toBe(90.0);
    expect(simulation.canSafelyBunk).toBe(true);
  });
});
