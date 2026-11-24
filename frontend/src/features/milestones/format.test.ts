import { describe, expect, it } from "vitest";
import { addWorkdays, awayLine, oneDecimal, percent, twoDecimals, workdaysAfter } from "./format";

describe("workdaysAfter", () => {
  // REQ-MILESTONE-UI-016 spare days counted Monday to Friday in (end, finish]
  it("REQ-MILESTONE-UI-016 counts working days after the first date up to the second", () => {
    expect(workdaysAfter("2026-12-23", "2026-12-31")).toBe(6);
    expect(workdaysAfter("2026-12-31", "2027-01-07")).toBe(5);
    expect(workdaysAfter("2026-11-06", "2026-11-08")).toBe(0); // Friday to Sunday
    expect(workdaysAfter("2026-11-08", "2026-11-08")).toBe(0);
  });
});

describe("addWorkdays", () => {
  it("REQ-REPORTS-027 returns iso for 0 and skips weekends", () => {
    expect(addWorkdays("2026-11-23", 0)).toBe("2026-11-23");
    expect(addWorkdays("2026-11-23", 10)).toBe("2026-12-07"); // Mon 23 Nov + 10 working days = Mon 7 Dec
    expect(addWorkdays("2026-11-23", 5)).toBe("2026-11-30"); // Mon 23 Nov + 5 working days = Mon 30 Nov
    expect(addWorkdays("2026-11-20", 1)).toBe("2026-11-23"); // Fri 20 Nov + 1 working day = Mon 23 Nov
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

describe("points formats", () => {
  it("REQ-MILESTONE-UI-021 percent, one and two decimals", () => {
    expect(percent(0.62)).toBe("62%");
    expect(percent(1)).toBe("100%");
    expect(oneDecimal(1)).toBe("1.0");
    expect(oneDecimal(1.4)).toBe("1.4");
    expect(twoDecimals(0.86)).toBe("0.86");
  });
});
