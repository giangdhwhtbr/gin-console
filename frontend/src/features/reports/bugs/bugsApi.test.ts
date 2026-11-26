import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchBugs } from "./bugsApi";
import { bugsReport } from "./bugsFixtures";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const stub = (response: Response) => {
  const mock = vi.fn(() => Promise.resolve(response.clone()));
  vi.stubGlobal("fetch", mock);
  return mock;
};
afterEach(() => vi.unstubAllGlobals());

describe("bugs api", () => {
  it("REQ-REPORTS-039 asks for the default scope without keys, else for the milestone or the period", async () => {
    const mock = stub(json(bugsReport()));
    await fetchBugs("alpha", { kind: "default" });
    expect(mock).toHaveBeenLastCalledWith("/api/reports/bugs?project=alpha");
    await fetchBugs("alpha", { kind: "milestone", id: "m1" });
    expect(mock).toHaveBeenLastCalledWith("/api/reports/bugs?project=alpha&milestone=m1");
    await fetchBugs("alpha", { kind: "period", days: 7 });
    expect(mock).toHaveBeenLastCalledWith("/api/reports/bugs?project=alpha&days=7");
  });

  it("REQ-REPORTS-044 returns the parsed report, nulls included", async () => {
    const body = bugsReport({ period: null, figures: { ...bugsReport().figures, oldest_open_days: null } });
    stub(json(body));
    expect(await fetchBugs("alpha", { kind: "default" })).toEqual(body);
  });

  it("REQ-REPORTS-044 throws the error of a 502", async () => {
    stub(json({ error: "bd failed" }, 502));
    await expect(fetchBugs("alpha", { kind: "default" })).rejects.toThrow("bd failed");
  });

  it.each([["figures"], ["weeks"], ["epics"], ["open"], ["today"]])("REQ-REPORTS-044 rejects a body without %s", async (key) => {
    stub(json({ ...bugsReport(), [key]: undefined }));
    await expect(fetchBugs("alpha", { kind: "default" })).rejects.toThrow("Could not load the bugs report (unexpected response)");
  });

  it("REQ-REPORTS-044 rejects a row of the wrong shape", async () => {
    stub(json(bugsReport({ open: [{ id: "a-1" }] as never })));
    await expect(fetchBugs("alpha", { kind: "default" })).rejects.toThrow("unexpected response");
  });
});
