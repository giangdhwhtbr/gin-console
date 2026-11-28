import { describe, expect, it } from "vitest";
import { caseFiltersToSearch, filterCases, parseCaseFilters, type CaseFilters } from "./filters";
import { caseRow } from "./fixtures";

const CASES = [
  caseRow({ id: "TC-UI-001", title: "Login form", capability: "ui", type: "api", effective_result: "outdated" }),
  caseRow({ id: "TC-UI-002", title: "Logout", capability: "ui", type: "e2e", effective_result: "passed" }),
  caseRow({ id: "TC-BEADS-001", title: "List beads", capability: "beads", type: "e2e", effective_result: "not run" }),
  caseRow({ id: "TC-UI-003", title: "Odd", capability: "ui", type: "e2e", effective_result: "skipped" }),
];
const none: CaseFilters = { capability: null, type: null, result: null, q: "", tab: "cases", days: 30 };
const ids = (filters: Partial<CaseFilters>) => filterCases(CASES, { ...none, ...filters }).map((row) => row.id);

describe("case filters", () => {
  it("REQ-QA-010 reads capability, type, result and q from the URL and ignores an unknown result", () => {
    expect(parseCaseFilters("?project=a&capability=ui&type=e2e&result=not_run&q=log")).toEqual({ capability: "ui", type: "e2e", result: "not_run", q: "log", tab: "cases", days: 30 });
    expect(parseCaseFilters("?project=a&result=nope")).toEqual(none);
  });

  it("REQ-QA-010 writes only the filters that are set, after the project", () => {
    expect(caseFiltersToSearch("a", { ...none, capability: "ui", result: "outdated" })).toBe("?project=a&capability=ui&result=outdated");
    expect(caseFiltersToSearch("a", none)).toBe("?project=a");
  });

  it("REQ-QA-018 reads tab and days, unknown values give Cases and 30, and Cases URLs stay unchanged", () => {
    expect(parseCaseFilters("?project=a&tab=trends&days=7")).toEqual({ ...none, tab: "trends", days: 7 });
    expect(parseCaseFilters("?project=a&tab=x&days=14")).toEqual(none);
    expect(caseFiltersToSearch("a", { ...none, tab: "trends", days: 7, capability: "ui" })).toBe("?project=a&tab=trends&days=7&capability=ui");
    expect(caseFiltersToSearch("a", { ...none, tab: "trends" })).toBe("?project=a&tab=trends");
    expect(caseFiltersToSearch("a", { ...none, days: 90 })).toBe("?project=a&days=90");
  });

  it("REQ-QA-010 filters by capability, type and result, not_run meaning 'not run' and other any unknown value", () => {
    expect(ids({ capability: "ui", result: "outdated" })).toEqual(["TC-UI-001"]);
    expect(ids({ type: "e2e" })).toEqual(["TC-UI-002", "TC-BEADS-001", "TC-UI-003"]);
    expect(ids({ result: "not_run" })).toEqual(["TC-BEADS-001"]);
    expect(ids({ result: "other" })).toEqual(["TC-UI-003"]);
  });

  it("REQ-QA-010 searches id and title without case", () => {
    expect(ids({ q: "LOG" })).toEqual(["TC-UI-001", "TC-UI-002"]);
    expect(ids({ q: "beads-001" })).toEqual(["TC-BEADS-001"]);
  });
});
