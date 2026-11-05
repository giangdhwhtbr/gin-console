import { describe, expect, it } from "vitest";
import { parseReportSearch, reportSearch } from "./filters";

describe("report filters", () => {
  it("REQ-UI-088 parses a shared link", () => {
    expect(parseReportSearch("?project=all&days=7")).toEqual({ project: "all", days: 7, sprint: "", tab: "delivery" });
  });
  it("REQ-UI-095 parses the tab and falls back to delivery", () => {
    expect(parseReportSearch("?tab=quality").tab).toBe("quality");
    expect(parseReportSearch("?tab=nope").tab).toBe("delivery");
  });
  it("REQ-UI-088 falls back to 30 days", () => {
    expect(parseReportSearch("?days=14").days).toBe(30);
    expect(parseReportSearch("").days).toBe(30);
  });
  it("REQ-UI-088 writes and encodes the search", () => {
    expect(reportSearch({ project: "alpha", days: 90, sprint: "", tab: "delivery" })).toBe("?project=alpha&days=90&tab=delivery");
    expect(reportSearch({ project: "alpha", days: 90, sprint: "s7", tab: "usage" })).toBe("?project=alpha&days=90&sprint=s7&tab=usage");
    expect(reportSearch({ project: "a b", days: 7, sprint: "x&y", tab: "coverage" })).toBe("?project=a+b&days=7&sprint=x%26y&tab=coverage");
  });
});
