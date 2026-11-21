import { describe, expect, it } from "vitest";
import { formatAge, formatTimes } from "./format";

const NOW = Date.parse("2026-10-15T03:00:00Z");

describe("format", () => {
  it("REQ-BEADS-018 writes an age as a relative time", () => {
    const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();
    expect(formatAge(ago(10), NOW)).toBe("just now");
    expect(formatAge(ago(180), NOW)).toBe("3 minutes ago");
    expect(formatAge(ago(7200), NOW)).toBe("2 hours ago");
    expect(formatAge(ago(3 * 86400), NOW)).toBe("3 days ago");
    expect(formatAge(ago(-500), NOW)).toBe("just now");
    expect(formatAge("garbage", NOW)).toBe("just now");
  });

  it("REQ-BEADS-018 writes the full time in local time and in UTC", () => {
    expect(formatTimes("2026-10-15T08:00:00Z")).toContain("2026-10-15 08:00 UTC");
    expect(formatTimes("nonsense")).toBe("nonsense");
  });
});
