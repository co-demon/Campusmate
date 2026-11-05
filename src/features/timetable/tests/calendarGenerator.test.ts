import { describe, it, expect } from "vitest";
import {
  generateSemesterClassOccurrences,
  applyHolidayCancellation,
} from "../services/calendarGenerator";
import { TimetableEntry, Holiday, ClassOccurrence } from "../types/timetable.types";

describe("Calendar Generation Engine", () => {
  const dummyEntries: TimetableEntry[] = [
    {
      id: "entry-1",
      user_id: "user-1",
      semester_id: "sem-1",
      subject_id: "sub-1",
      subject_code: "CS101",
      subject_name: "Intro to CS",
      weekday: 1,
      day_of_week: 1, // Monday
      start_time: "09:00:00",
      end_time: "10:00:00",
      room: "301",
      faculty_name: "Dr. Smith",
      slot_type: "lecture",
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "entry-2",
      user_id: "user-1",
      semester_id: "sem-1",
      subject_id: "sub-2",
      subject_code: "CS102",
      subject_name: "Data Structures",
      weekday: 3,
      day_of_week: 3, // Wednesday
      start_time: "11:00:00",
      end_time: "12:00:00",
      room: "302",
      faculty_name: "Prof. Davis",
      slot_type: "lecture",
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ];

  it("generates correct scheduled occurrences across a date range", () => {
    // 2024-09-02 (Monday) to 2024-09-08 (Sunday) = 1 full week
    // Expect 1 Monday class and 1 Wednesday class = 2 occurrences
    const result = generateSemesterClassOccurrences({
      userId: "user-1",
      semesterId: "sem-1",
      timetableEntries: dummyEntries,
      startDate: "2024-09-02",
      endDate: "2024-09-08",
    });

    expect(result.newOccurrences.length).toBe(2);
    expect(result.skippedCount).toBe(0);
    expect(result.newOccurrences[0].date).toBe("2024-09-02");
    expect(result.newOccurrences[0].subjectId).toBe("sub-1");
    expect(result.newOccurrences[1].date).toBe("2024-09-04");
    expect(result.newOccurrences[1].subjectId).toBe("sub-2");
  });

  it("strictly avoids duplicating existing occurrences on re-upload", () => {
    const existing: ClassOccurrence[] = [
      {
        id: "occ-existing-1",
        user_id: "user-1",
        semester_id: "sem-1",
        subject_id: "sub-1",
        timetable_entry_id: "entry-1",
        date: "2024-09-02",
        start_time: "09:00:00",
        end_time: "10:00:00",
        room: "301",
        faculty_name: "Dr. Smith",
        event_type: "regular",
        status: "completed",
        cancellation_reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const result = generateSemesterClassOccurrences({
      userId: "user-1",
      semesterId: "sem-1",
      timetableEntries: dummyEntries,
      startDate: "2024-09-02",
      endDate: "2024-09-08",
      existingOccurrences: existing,
    });

    // Monday was already generated; only Wednesday should be generated
    expect(result.newOccurrences.length).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.newOccurrences[0].date).toBe("2024-09-04");
  });

  it("automatically marks occurrences as cancelled on declared holidays", () => {
    const holidays: Holiday[] = [
      {
        id: "hol-1",
        user_id: null,
        college_id: null,
        name: "Labor Day",
        date: "2024-09-02",
        description: "Public holiday",
        applies_to_all: true,
        created_at: new Date().toISOString(),
      },
    ];

    const result = generateSemesterClassOccurrences({
      userId: "user-1",
      semesterId: "sem-1",
      timetableEntries: dummyEntries,
      startDate: "2024-09-02",
      endDate: "2024-09-08",
      holidays,
    });

    const mondayOccurrence = result.newOccurrences.find(o => o.date === "2024-09-02");
    expect(mondayOccurrence?.status).toBe("cancelled");
    expect(mondayOccurrence?.cancellationReason).toContain("Labor Day");
  });

  it("allows bulk cancelling classes on an emergency holiday without corrupting data", () => {
    const initialOccurrences: ClassOccurrence[] = [
      {
        id: "occ-1",
        user_id: "user-1",
        semester_id: "sem-1",
        subject_id: "sub-1",
        timetable_entry_id: "entry-1",
        date: "2024-09-04",
        start_time: "09:00:00",
        end_time: "10:00:00",
        room: "301",
        faculty_name: "Dr. Smith",
        event_type: "regular",
        status: "upcoming",
        cancellation_reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "occ-2",
        user_id: "user-1",
        semester_id: "sem-1",
        subject_id: "sub-2",
        timetable_entry_id: "entry-2",
        date: "2024-09-04",
        start_time: "11:00:00",
        end_time: "12:00:00",
        room: "302",
        faculty_name: "Prof. Davis",
        event_type: "regular",
        status: "upcoming",
        cancellation_reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const { updatedOccurrences, cancelledCount } = applyHolidayCancellation(
      "2024-09-04",
      "Flash Flood Alert",
      initialOccurrences
    );

    expect(cancelledCount).toBe(2);
    expect(updatedOccurrences[0].status).toBe("cancelled");
    expect(updatedOccurrences[0].cancellation_reason).toContain("Flash Flood Alert");
    expect(updatedOccurrences[1].status).toBe("cancelled");
  });
});
