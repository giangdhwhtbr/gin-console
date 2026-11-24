import { afterEach, describe, expect, it, vi } from "vitest";
import { teamReport } from "./team/teamFixtures";
import { fetchTeam, selectedMilestone } from "./teamApi";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const stub = (response: Response) => {
  const mock = vi.fn(() => Promise.resolve(response.clone()));
  vi.stubGlobal("fetch", mock);
  return mock;
};
afterEach(() => vi.unstubAllGlobals());

describe("team api", () => {
  it("REQ-REPORTS-012 REQ-REPORTS-033 asks for the default scope without keys, else for the milestone or the period", async () => {
    const mock = stub(json(teamReport()));
    await fetchTeam("alpha", { kind: "default" });
    expect(mock).toHaveBeenLastCalledWith("/api/reports/team?project=alpha");
    await fetchTeam("alpha", { kind: "milestone", id: "m1" });
    expect(mock).toHaveBeenLastCalledWith("/api/reports/team?project=alpha&milestone=m1");
    await fetchTeam("alpha", { kind: "period", days: 7 });
    expect(mock).toHaveBeenLastCalledWith("/api/reports/team?project=alpha&days=7");
  });

  it("REQ-REPORTS-012 parses a report and selects its milestone", async () => {
    stub(json(teamReport()));
    const report = await fetchTeam("alpha", { kind: "default" });
    expect(report.beads).toHaveLength(4);
    expect(selectedMilestone(report)?.id).toBe("m2");
    expect(selectedMilestone({ ...report, milestone: null })).toBeNull();
  });

  it.each(["milestones", "beads", "members", "trend"])("REQ-REPORTS-017 rejects a body without %s", async (key) => {
    stub(json({ ...teamReport(), [key]: undefined }));
    await expect(fetchTeam("alpha", { kind: "default" })).rejects.toThrow("Could not load the team report (unexpected response)");
  });

  it("REQ-REPORTS-017 rejects a body without a valid unassigned count", async () => {
    stub(json({ ...teamReport(), unassigned: undefined }));
    await expect(fetchTeam("alpha", { kind: "default" })).rejects.toThrow("Could not load the team report (unexpected response)");
    stub(json({ ...teamReport(), unassigned: { closed: "8", total: 30 } }));
    await expect(fetchTeam("alpha", { kind: "default" })).rejects.toThrow("Could not load the team report (unexpected response)");
  });

  it("REQ-REPORTS-017 maps 404 and 502", async () => {
    stub(json({}, 404));
    await expect(fetchTeam("alpha", { kind: "default" })).rejects.toThrow("Project not found");
    stub(json({ error: "boom" }, 502));
    await expect(fetchTeam("alpha", { kind: "default" })).rejects.toThrow("boom");
  });
});
