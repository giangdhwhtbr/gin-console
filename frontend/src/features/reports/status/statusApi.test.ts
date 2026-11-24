import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchStatus } from "./statusApi";
import { statusReport } from "./statusFixtures";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const stub = (response: Response) => {
  const mock = vi.fn(() => Promise.resolve(response.clone()));
  vi.stubGlobal("fetch", mock);
  return mock;
};
afterEach(() => vi.unstubAllGlobals());

describe("statusApi", () => {
  it("REQ-REPORTS-020 REQ-REPORTS-033 requests default, milestone or period scope", async () => {
    const mock = stub(json(statusReport()));
    await fetchStatus("alpha", { kind: "default" });
    expect(mock).toHaveBeenLastCalledWith("/api/reports/status?project=alpha");
    await fetchStatus("alpha", { kind: "milestone", id: "m2" });
    expect(mock).toHaveBeenLastCalledWith("/api/reports/status?project=alpha&milestone=m2");
    await fetchStatus("alpha", { kind: "period", days: 30 });
    expect(mock).toHaveBeenLastCalledWith("/api/reports/status?project=alpha&days=30");
  });

  it.each(["milestones", "burnup", "epics", "kpis", "changes", "risks"])("REQ-REPORTS-032 rejects a body missing %s", async (key) => {
    stub(json({ ...statusReport(), [key]: undefined }));
    await expect(fetchStatus("alpha", { kind: "default" })).rejects.toThrow("Could not load the status report (unexpected response)");
  });

  it("REQ-REPORTS-032 maps 404 and 502 errors", async () => {
    stub(json({}, 404));
    await expect(fetchStatus("alpha", { kind: "default" })).rejects.toThrow("Project not found");
    stub(json({ error: "snapshot broken" }, 502));
    await expect(fetchStatus("alpha", { kind: "default" })).rejects.toThrow("snapshot broken");
  });
});
