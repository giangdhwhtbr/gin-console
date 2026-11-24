import { describe, expect, it } from "vitest";
import { fixedSearch, parseReportSearch, reportSearch, scopeQuery } from "./filters";

describe("report filters", () => {
  it("REQ-UI-088 shared link: parses the project and the period", () => {
    expect(parseReportSearch("?project=all&days=7")).toEqual({ project: "all", scope: { kind: "period", days: 7 }, member: "", status: "" });
  });
  it("REQ-REPORTS-033 parses a milestone scope, and a milestone wins over days", () => {
    expect(parseReportSearch("?project=a&milestone=m1").scope).toEqual({ kind: "milestone", id: "m1" });
    expect(parseReportSearch("?project=a&days=7&milestone=m1").scope).toEqual({ kind: "milestone", id: "m1" });
  });
  it("REQ-REPORTS-033 neither key, or a bad period, is the default scope", () => {
    expect(parseReportSearch("?project=a").scope).toEqual({ kind: "default" });
    expect(parseReportSearch("?days=14").scope).toEqual({ kind: "default" });
    expect(parseReportSearch("?milestone=").scope).toEqual({ kind: "default" });
  });
  it("REQ-REPORTS-012 parses member and status", () => {
    expect(parseReportSearch("?milestone=m1&member=ann&status=closed")).toMatchObject({ member: "ann", status: "closed" });
    expect(parseReportSearch("?status=bogus").status).toBe("");
  });
  it("REQ-REPORTS-033 writes project, then milestone or days, member and status, never tab or sprint", () => {
    const base = { project: "alpha", scope: { kind: "milestone", id: "m2" } as const, member: "", status: "" as const };
    expect(reportSearch(base)).toBe("?project=alpha&milestone=m2");
    expect(reportSearch({ ...base, member: "ann", status: "closed" })).toBe("?project=alpha&milestone=m2&member=ann&status=closed");
    expect(reportSearch({ ...base, scope: { kind: "period", days: 90 } })).toBe("?project=alpha&days=90");
    expect(reportSearch({ ...base, scope: { kind: "default" } })).toBe("?project=alpha");
    expect(reportSearch({ ...base, project: "a b", scope: { kind: "milestone", id: "x&y" } })).toBe("?project=a+b&milestone=x%26y");
  });
  it("REQ-REPORTS-033 the scope as request keys", () => {
    expect(scopeQuery({ kind: "milestone", id: "m1" }).toString()).toBe("milestone=m1");
    expect(scopeQuery({ kind: "period", days: 7 }).toString()).toBe("days=7");
  });
  it("REQ-REPORTS-033 Old link with a sprint and both keys: drops sprint, and days next to a milestone", () => {
    expect(fixedSearch("?project=alpha&days=7&milestone=m1&sprint=s7")).toBe("?project=alpha&milestone=m1");
    expect(fixedSearch("?project=alpha&days=30&sprint=s7")).toBe("?project=alpha&days=30");
    expect(fixedSearch("?sprint=s7")).toBe("");
  });
  it("REQ-REPORTS-033 a search without sprint or both keys needs no fix", () => {
    expect(fixedSearch("?project=alpha&days=7")).toBeNull();
    expect(fixedSearch("?project=alpha&milestone=m1&member=ann")).toBeNull();
    expect(fixedSearch("")).toBeNull();
  });
});
