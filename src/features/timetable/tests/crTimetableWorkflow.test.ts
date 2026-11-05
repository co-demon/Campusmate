import { describe, it, expect, beforeEach } from "vitest";
import { campusRepository } from "../../../lib/database/campusRepository";
import { TimetableEntryDraft } from "../types/timetable.types";

describe("CampusMate v3 CR Timetable Workflow & Lab Subgroups", () => {
  beforeEach(() => {
    campusRepository.resetDemoData();
  });

  it("loads the default published timetable and enforces lab subgroup filtering for students", async () => {
    const classGroup = await campusRepository.getActiveClassGroup();
    expect(classGroup.name).toBe("CSE-3A");

    // Student Alex Mercer belongs to Lab B
    const student = await campusRepository.getActiveProfile();
    expect(student.role).toBe("student");
    expect(student.subgroupId).toBe("subgroup-lab-b");

    // Published timetable for student in Lab B
    const { version, entries } = await campusRepository.getPublishedTimetable(classGroup.id, student.subgroupId);
    expect(version).not.toBeNull();
    expect(version?.status).toBe("published");
    expect(entries.length).toBeGreaterThan(0);

    // Verify student sees Lab B slots and lectures, but NOT Lab A or Lab C
    const labBSlots = entries.filter((e) => e.subgroup_code === "B");
    const labASlots = entries.filter((e) => e.subgroup_code === "A");
    const labCSlots = entries.filter((e) => e.subgroup_code === "C");

    expect(labBSlots.length).toBeGreaterThan(0);
    expect(labASlots.length).toBe(0); // Excluded!
    expect(labCSlots.length).toBe(0); // Excluded!
  });

  it("allows approved CR to create a new draft with lab subgroups and publish it", async () => {
    const classGroup = await campusRepository.getActiveClassGroup();
    
    // Switch to CR persona
    await campusRepository.switchActiveUser("cr");
    const crProfile = await campusRepository.getActiveProfile();
    expect(crProfile.role).toBe("cr");

    const isCrApproved = await campusRepository.isApprovedCR(classGroup.id, crProfile.id);
    expect(isCrApproved).toBe(true);

    const newDraftSlots: TimetableEntryDraft[] = [
      {
        weekday: 1,
        subjectCode: "CS501",
        subjectName: "Database Systems Advanced",
        startTime: "09:00:00",
        endTime: "10:00:00",
        room: "LH-305",
        instructor: "Dr. Arvind Sharma",
        slotType: "lecture",
        subgroupCode: null,
      },
      {
        weekday: 2,
        subjectCode: "CS505L",
        subjectName: "Advanced DBMS Lab (Lab A)",
        startTime: "13:30:00",
        endTime: "15:30:00",
        room: "CS Lab 2",
        instructor: "Dr. Arvind Sharma",
        slotType: "lab",
        subgroupCode: "A",
      },
      {
        weekday: 4,
        subjectCode: "CS505L",
        subjectName: "Advanced DBMS Lab (Lab B)",
        startTime: "13:30:00",
        endTime: "15:30:00",
        room: "CS Lab 2",
        instructor: "Dr. Arvind Sharma",
        slotType: "lab",
        subgroupCode: "B",
      },
    ];

    const draftRes = await campusRepository.createTimetableDraft({
      classGroupId: classGroup.id,
      entries: newDraftSlots,
      notes: "Midterm Revised Schedule with Lab Subgroups",
      fileName: "Revised_Timetable_v2.pdf",
    });

    expect(draftRes.success).toBe(true);
    expect(draftRes.versionId).toBeDefined();

    // Verify draft status
    const versionsBefore = await campusRepository.getTimetableVersions(classGroup.id);
    const draftVersion = versionsBefore.find((v) => v.id === draftRes.versionId);
    expect(draftVersion?.status).toBe("draft");
    expect(draftVersion?.version_number).toBe(2);

    // Publish the draft
    await campusRepository.publishTimetableVersion(draftRes.versionId, classGroup.id);

    // Check that version 1 is archived and version 2 is published
    const versionsAfter = await campusRepository.getTimetableVersions(classGroup.id);
    const v1 = versionsAfter.find((v) => v.version_number === 1);
    const v2 = versionsAfter.find((v) => v.version_number === 2);

    expect(v1?.status).toBe("archived");
    expect(v2?.status).toBe("published");
  });

  it("records session cancellations in class_change_log audit trail", async () => {
    const classGroup = await campusRepository.getActiveClassGroup();
    await campusRepository.switchActiveUser("cr");
    const cr = await campusRepository.getActiveProfile();

    const cancelRes = await campusRepository.cancelClassSession({
      sessionId: "slot-2",
      classGroupId: classGroup.id,
      reason: "Emergency department meeting",
      changedBy: cr.id,
      affectedSubject: "CS502",
      affectedDate: "2024-11-15",
    });

    expect(cancelRes.success).toBe(true);

    const changeLog = await campusRepository.getClassChangeLog(classGroup.id);
    expect(changeLog.length).toBeGreaterThan(0);
    expect(changeLog[0].action).toBe("cancelled");
    expect(changeLog[0].reason).toBe("Emergency department meeting");
    expect(changeLog[0].changed_by).toBe(cr.id);
  });

  it("isolates student personal attendance records from CR published schedule", async () => {
    const classGroup = await campusRepository.getActiveClassGroup();
    await campusRepository.switchActiveUser("student");
    const student = await campusRepository.getActiveProfile();
    expect(student.role).toBe("student");

    const published = await campusRepository.getPublishedTimetable(classGroup.id);
    const firstSlot = published.entries[0];

    // Student marks their own attendance
    const testDate = "2024-11-04";
    const markRes = await campusRepository.markStudentAttendance({
      timetableEntryId: firstSlot.id,
      sessionId: firstSlot.id,
      classGroupId: classGroup.id,
      date: testDate,
      status: "attended",
    });

    expect(markRes.success).toBe(true);

    const occurrences = await campusRepository.getClassOccurrences(testDate, testDate);
    const match = occurrences.find((o) => o.id === `occ-${firstSlot.id}-${testDate}`);
    expect(match).toBeDefined();
    expect(match?.attendanceRecord?.status).toBe("attended");

    // Switch to absent
    await campusRepository.markStudentAttendance({
      timetableEntryId: firstSlot.id,
      sessionId: firstSlot.id,
      classGroupId: classGroup.id,
      date: testDate,
      status: "absent",
      remarks: "Fever and Doctor Appointment",
    });

    const occurrencesAfter = await campusRepository.getClassOccurrences(testDate, testDate);
    const matchAfter = occurrencesAfter.find((o) => o.id === `occ-${firstSlot.id}-${testDate}`);
    expect(matchAfter?.attendanceRecord?.status).toBe("absent");
    expect(matchAfter?.attendanceRecord?.remarks).toBe("Fever and Doctor Appointment");
  });
});
