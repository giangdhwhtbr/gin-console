process.env.TZ = "America/Los_Angeles";
import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./dates";

describe("dates in a western time zone", () => {
  it("REQ-UI-131 runs in America/Los_Angeles", () => {
    expect(new Date("2026-12-01T05:00:00Z").getHours()).toBe(21);
  });

  it("REQ-UI-131 shows a calendar day without time as that day in every time zone", () => {
    expect(formatDate("2026-12-01", "2026-11-21")).toBe("1 Dec");
  });

  it("REQ-UI-131 shows a timestamp in the browser's time zone", () => {
    expect(formatDateTime("2026-12-01T05:00:00Z", "2026-11-21")).toBe("30 Nov, 21:00");
  });
});
