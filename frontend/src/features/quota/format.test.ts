import { describe, expect, it } from "vitest";
import { formatWindow } from "./format";

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
});
