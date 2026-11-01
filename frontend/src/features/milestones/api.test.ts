import { afterEach, describe, expect, it, vi } from "vitest";
import { json } from "@/features/beads/beadFixtures";
import { fetchMilestone, fetchMilestones, milestonePath, MilestonesError } from "./api";
import { detail, entry, epicPlan, list, stubMilestones } from "./milestoneFixtures";

afterEach(() => vi.unstubAllGlobals());

describe("milestones api", () => {
  it("REQ-MILESTONE-UI-001 reads the list of a project", async () => {
    const fetchMock = stubMilestones(() => json(list([entry("m-1")], { unassigned_epics: 4 })));
    expect((await fetchMilestones("al pha")).unassigned_epics).toBe(4);
    expect(fetchMock).toHaveBeenCalledWith("/api/milestones?project=al%20pha");
  });

  it("REQ-MILESTONE-UI-004 asks a preview with start", async () => {
    const fetchMock = stubMilestones(() => json(detail([epicPlan("e-a")])));
    await fetchMilestone("alpha", "m-1", "2026-11-16");
    expect(fetchMock).toHaveBeenCalledWith("/api/milestones/alpha/m-1?start=2026-11-16");
  });

  it("REQ-MILESTONE-UI-005 keeps the cause of a 502", async () => {
    stubMilestones(() => json({ error: "no milestone command", cause: "outdated" }, 502));
    const error = await fetchMilestones("alpha").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(MilestonesError);
    expect(error instanceof MilestonesError ? [error.message, error.kind] : []).toEqual(["no milestone command", "outdated"]);
  });

  it("REQ-MILESTONE-UI-008 refuses an unexpected shape", async () => {
    stubMilestones(() => json({ milestones: [{ id: 1 }], unassigned_epics: 0, today: "2026-10-29" }));
    await expect(fetchMilestones("alpha")).rejects.toThrow("unexpected response");
  });

  it("builds milestone paths", () => {
    expect(milestonePath("al pha", "m-1")).toBe("/milestones/al%20pha/m-1");
    expect(milestonePath("alpha", "m-1", "graph", "2026-11-16")).toBe("/milestones/alpha/m-1?tab=graph&start=2026-11-16");
    expect(milestonePath("alpha", "m-1", "gantt", null, "2w")).toBe("/milestones/alpha/m-1?zoom=2w"); // REQ-MILESTONE-UI-011
    expect(milestonePath("alpha", "m-1", "gantt", null, "all")).toBe("/milestones/alpha/m-1");
  });
});
