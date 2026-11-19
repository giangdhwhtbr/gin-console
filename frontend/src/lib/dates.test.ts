import { describe, expect, it } from "vitest";
import { factDate } from "./dates";

describe("factDate", () => {
  it("REQ-UI-028 writes '<d> <Mon> <yyyy> <HH:mm>' in the local time zone, without seconds", () => {
    expect(factDate(new Date(2026, 4, 11, 16, 0, 42).toISOString())).toBe("11 May 2026 16:00");
    expect(factDate(new Date(2026, 0, 3, 9, 5).toISOString())).toBe("3 Jan 2026 09:05");
  });
});
