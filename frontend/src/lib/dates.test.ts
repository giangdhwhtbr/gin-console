import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatRange } from "./dates";

const TODAY = "2026-11-21";

describe("one date format", () => {
  // REQ-UI-131
  it("REQ-UI-131 writes a date without the year in the current year and with it otherwise", () => {
    expect(formatDate("2026-11-05", TODAY)).toBe("5 Nov");
    expect(formatDate("2025-12-01", TODAY)).toBe("1 Dec 2025");
    expect(formatDate("2026-12-01T10:00:00Z", TODAY)).toMatch(/^\d{1,2} Dec$/);
  });

  it("REQ-UI-131 writes a date-time on a 24-hour clock in the browser's time zone", () => {
    expect(formatDateTime(new Date(2026, 4, 11, 16, 0, 42).toISOString(), "2026-06-01")).toBe("11 May, 16:00");
    expect(formatDateTime(new Date(2025, 0, 3, 9, 5).toISOString(), "2026-06-01")).toBe("3 Jan 2025, 09:05");
  });

  it("REQ-UI-131 writes the year of a range once after the end, or after each end", () => {
    expect(formatRange("2026-11-10", "2026-12-01", TODAY)).toBe("10 Nov – 1 Dec");
    expect(formatRange("2025-11-03", "2025-11-28", TODAY)).toBe("3 Nov – 28 Nov 2025");
    expect(formatRange("2026-12-14", "2027-01-08", TODAY)).toBe("14 Dec 2026 – 8 Jan 2027");
  });

  it("REQ-UI-120 shows a forecast finish in the next year with its year", () => {
    expect(formatDate("2027-02-16", "2026-11-20")).toBe("16 Feb 2027");
    expect(formatRange("2026-11-10", "2026-12-01", "2026-11-20")).toBe("10 Nov – 1 Dec");
  });

  it("REQ-UI-131 returns a value that is not a date unchanged", () => {
    expect(formatDate("nonsense", TODAY)).toBe("nonsense");
    expect(formatDateTime("", TODAY)).toBe("");
    expect(formatRange("a", "b", TODAY)).toBe("a – b");
  });
});
