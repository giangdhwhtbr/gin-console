import { describe, expect, it } from "vitest";
import { formatDuration, sinceText } from "./duration";

describe("formatDuration", () => {
  it("REQ-QA-018 gives the two largest non-zero units and < 1 min below a minute", () => {
    expect(formatDuration(30)).toBe("< 1 min");
    expect(formatDuration(120)).toBe("2 min");
    expect(formatDuration(6300)).toBe("1 h 45 min");
    expect(formatDuration(90000)).toBe("1 d 1 h");
    expect(formatDuration(86400 + 120)).toBe("1 d 2 min");
    expect(formatDuration(86400 * 3 + 3600 * 5 + 60 * 7)).toBe("3 d 5 h");
  });

  it("REQ-QA-018 sinceText is the time from a moment to now", () => {
    expect(sinceText("2026-06-03T08:00:00Z", new Date("2026-06-03T09:45:00Z"))).toBe("1 h 45 min");
  });
});
