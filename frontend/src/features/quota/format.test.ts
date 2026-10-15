import { describe, expect, it } from "vitest";
import { formatAge, formatTimes, formatWindow } from "./format";

const NOW = Date.parse("2026-10-15T03:00:00Z");

describe("format", () => {
  // REQ-UI-019
  it("REQ-UI-019 names a window length in hours or days", () => {
    expect(formatWindow(300)).toBe("5 hours");
    expect(formatWindow(10080)).toBe("7 days");
    expect(formatWindow(43200)).toBe("30 days");
    expect(formatWindow(60)).toBe("1 hour");
    expect(formatWindow(90)).toBe("90 minutes");
    expect(formatWindow(null)).toBe("unknown length");
  });

  // REQ-UI-018
  it("REQ-UI-018 says how long ago the data was fetched", () => {
    const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();
    expect(formatAge(ago(10), NOW)).toBe("just now");
    expect(formatAge(ago(180), NOW)).toBe("3 minutes ago");
    expect(formatAge(ago(7200), NOW)).toBe("2 hours ago");
    expect(formatAge(ago(3 * 86400), NOW)).toBe("3 days ago");
    expect(formatAge(ago(-500), NOW)).toBe("just now");
    expect(formatAge("garbage", NOW)).toBe("just now");
  });

  // REQ-UI-018
  it("REQ-UI-018 shows a reset time in local time and in UTC", () => {
    expect(formatTimes("2026-10-15T08:00:00Z")).toContain("2026-10-15 08:00 UTC");
    expect(formatTimes("nonsense")).toBe("nonsense");
  });
});
