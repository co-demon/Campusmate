import { describe, it, expect } from "vitest";
import { normalizeTimeString, generateIntelligentSampleOrOCR } from "../services/timetableParser";

describe("Timetable Parser", () => {
  it("normalizes various time formats correctly", () => {
    expect(normalizeTimeString("9:00")).toBe("09:00:00");
    expect(normalizeTimeString("09:15")).toBe("09:15:00");
    expect(normalizeTimeString("9:30 AM")).toBe("09:30:00");
    expect(normalizeTimeString("2:30 PM")).toBe("14:30:00");
    expect(normalizeTimeString("12:00 PM")).toBe("12:00:00");
    expect(normalizeTimeString("12:30 AM")).toBe("00:30:00");
  });

  it("generates intelligent structured timetable from sample file name", () => {
    const extracted = generateIntelligentSampleOrOCR("my_cse_timetable.pdf");
    expect(extracted.confidence).toBeGreaterThan(0.9);
    expect(extracted.subjects.length).toBeGreaterThanOrEqual(4);
    expect(extracted.slots.length).toBeGreaterThan(5);

    // Verify day of week is 1-7
    for (const slot of extracted.slots) {
      expect(slot.dayOfWeek).toBeGreaterThanOrEqual(1);
      expect(slot.dayOfWeek).toBeLessThanOrEqual(7);
      expect(slot.startTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(slot.endTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    }
  });
});
