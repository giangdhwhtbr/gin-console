import { describe, expect, it } from "vitest";
import { parseReportSearch, reportSearch } from "./filters";

describe("report filters", () => {
  it("REQ-UI-088 parses a shared link", () => {
    expect(parseReportSearch("?project=all&days=7")).toEqual({ project: "all", days: 7, sprint: "", tab: "team", milestone: "", member: "", status: "" });
  });
  it("REQ-UI-095 defaults to the team tab", () => {
    expect(parseReportSearch("?tab=quality").tab).toBe("quality");
    expect(parseReportSearch("?project=a").tab).toBe("team");
    expect(parseReportSearch("?tab=nope").tab).toBe("team");
  });
  it("REQ-REPORTS-012 parses milestone, member and status", () => {
    expect(parseReportSearch("?milestone=m1&member=ann&status=closed")).toMatchObject({ milestone: "m1", member: "ann", status: "closed" });
    expect(parseReportSearch("?status=bogus").status).toBe("");
  });
  it("REQ-REPORTS-012 writes them only when set", () => {
    const base = { project: "alpha", days: 30 as const, sprint: "", tab: "team" as const, milestone: "m2", member: "", status: "" as const };
    expect(reportSearch(base)).toBe("?project=alpha&days=30&tab=team&milestone=m2");
    expect(reportSearch({ ...base, member: "ann", status: "closed" })).toBe("?project=alpha&days=30&tab=team&milestone=m2&member=ann&status=closed");
  });
  it("REQ-UI-088 falls back to 30 days", () => {
    expect(parseReportSearch("?days=14").days).toBe(30);
    expect(parseReportSearch("").days).toBe(30);
  });
  it("REQ-UI-088 writes and encodes the search", () => {
    expect(reportSearch({ project: "alpha", days: 90, sprint: "", tab: "delivery", milestone: "", member: "", status: "" })).toBe("?project=alpha&days=90&tab=delivery");
    expect(reportSearch({ project: "alpha", days: 90, sprint: "s7", tab: "usage", milestone: "", member: "", status: "" })).toBe("?project=alpha&days=90&sprint=s7&tab=usage");
    expect(reportSearch({ project: "a b", days: 7, sprint: "x&y", tab: "coverage", milestone: "", member: "", status: "" })).toBe("?project=a+b&days=7&sprint=x%26y&tab=coverage");
  });
});
