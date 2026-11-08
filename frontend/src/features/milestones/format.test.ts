import { describe, expect, it } from "vitest";
import { workdaysAfter } from "./format";

describe("workdaysAfter", () => {
  // REQ-MILESTONE-UI-016 spare days counted Monday to Friday in (end, finish]
  it("REQ-MILESTONE-UI-016 counts working days after the first date up to the second", () => {
    expect(workdaysAfter("2026-12-23", "2026-12-31")).toBe(6);
    expect(workdaysAfter("2026-12-31", "2027-01-07")).toBe(5);
    expect(workdaysAfter("2026-11-06", "2026-11-08")).toBe(0); // Friday to Sunday
    expect(workdaysAfter("2026-11-08", "2026-11-08")).toBe(0);
  });
});
