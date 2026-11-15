import { describe, expect, it } from "vitest";
import { awayLine, workdaysAfter } from "./format";

describe("workdaysAfter", () => {
  // REQ-MILESTONE-UI-016 spare days counted Monday to Friday in (end, finish]
  it("REQ-MILESTONE-UI-016 counts working days after the first date up to the second", () => {
    expect(workdaysAfter("2026-12-23", "2026-12-31")).toBe(6);
    expect(workdaysAfter("2026-12-31", "2027-01-07")).toBe(5);
    expect(workdaysAfter("2026-11-06", "2026-11-08")).toBe(0); // Friday to Sunday
    expect(workdaysAfter("2026-11-08", "2026-11-08")).toBe(0);
  });
});

describe("awayLine", () => {
  const today = "2026-11-15";
  it("REQ-MILESTONE-UI-020 reads single days and ranges, within and across months", () => {
    expect(awayLine({ ann: ["2026-11-18..2026-11-20"], bao: ["2026-11-25"] }, today)).toBe("Away: ann 18–20 Nov, bao 25 Nov");
    expect(awayLine({ ann: ["2026-11-30..2026-12-02", "2026-12-07"] }, today)).toBe("Away: ann 30 Nov–2 Dec, 7 Dec");
  });
  it("REQ-MILESTONE-UI-020 shows a malformed entry raw and nothing for empty input", () => {
    expect(awayLine({ ann: ["next week"] }, today)).toBe("Away: ann next week");
    expect(awayLine({}, today)).toBeNull();
    expect(awayLine({ ann: [] }, today)).toBeNull();
  });
});
