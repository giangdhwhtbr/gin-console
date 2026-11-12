import { describe, expect, it } from "vitest";
import { formatDate, lateDays, memberColor, workdaysAfter } from "./format";

describe("team format", () => {
  it("REQ-REPORTS-012 counts working days after a date", () => {
    expect(workdaysAfter("2026-11-27", "2026-12-01")).toBe(2);
    expect(workdaysAfter("2026-11-12", "2026-11-12")).toBe(0);
    expect(workdaysAfter("2026-11-13", "2026-11-12")).toBe(0);
  });
  it("REQ-REPORTS-012 late days of a closed milestone", () => {
    const m = { id: "m", title: "m", status: "closed" as const, start: "2026-10-12", end: "2026-10-30", closed_on: "2026-11-03" };
    expect(lateDays(m)).toBe(2);
    expect(lateDays({ ...m, closed_on: null })).toBe(0);
  });
  it("REQ-REPORTS-013 member colors follow the member order; Unassigned is muted", () => {
    expect(memberColor(["ann", "bao"], "bao")).toBe("var(--series-2)");
    expect(memberColor(["ann", "bao"], "Unassigned")).toBe("var(--color-muted-foreground)");
    expect(memberColor(Array.from({ length: 9 }, (_, i) => `m${i}`), "m8")).toBe("var(--series-1)");
  });
  it("REQ-REPORTS-012 formats a date as day and month", () => {
    expect(formatDate("2026-11-27")).toBe("27 Nov");
  });
});
