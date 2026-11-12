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
  it("REQ-REPORTS-012 omits the milestone when empty and adds it otherwise", async () => {
    const mock = stub(json(teamReport()));
    await fetchTeam("alpha", "");
    expect(mock).toHaveBeenLastCalledWith("/api/reports/team?project=alpha");
    await fetchTeam("alpha", "m1");
    expect(mock).toHaveBeenLastCalledWith("/api/reports/team?project=alpha&milestone=m1");
  });

  it("REQ-REPORTS-012 parses a report and selects its milestone", async () => {
    stub(json(teamReport()));
    const report = await fetchTeam("alpha", "");
    expect(report.beads).toHaveLength(4);
    expect(selectedMilestone(report)?.id).toBe("m2");
    expect(selectedMilestone({ ...report, milestone: null })).toBeNull();
  });

  it.each(["milestones", "beads", "members"])("REQ-REPORTS-017 rejects a body without %s", async (key) => {
    stub(json({ ...teamReport(), [key]: undefined }));
    await expect(fetchTeam("alpha", "")).rejects.toThrow("Could not load the team report (unexpected response)");
  });

  it("REQ-REPORTS-017 maps 404 and 502", async () => {
    stub(json({}, 404));
    await expect(fetchTeam("alpha", "")).rejects.toThrow("Project not found");
    stub(json({ error: "boom" }, 502));
    await expect(fetchTeam("alpha", "")).rejects.toThrow("boom");
  });
});
