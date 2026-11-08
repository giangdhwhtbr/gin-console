import { afterEach, describe, expect, it, vi } from "vitest";
import { json } from "@/features/beads/beadFixtures";
import { fetchMilestone, fetchMilestones, milestonePath, MilestonesError, type Forecast } from "./api";
import { detail, entry, epicPlan, forecast, list, stubMilestones } from "./milestoneFixtures";

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

  it("REQ-MILESTONE-UI-008 reads forecast and lanes", async () => {
    stubMilestones(() => json(list([entry("m-1", { lanes: 2 })], { forecast: forecast() })));
    const body = await fetchMilestones("alpha");
    expect(body.forecast?.finish).toBe("2026-12-23");
    expect(body.milestones[0].lanes).toBe(2);
  });

  it("REQ-MILESTONE-UI-008 older output: missing forecast and lanes become null", async () => {
    const without = (x: object, key: string) => Object.fromEntries(Object.entries(x).filter(([k]) => k !== key));
    stubMilestones((url) =>
      url.pathname.endsWith("/m-1")
        ? json(without(detail([epicPlan("e-a")]), "lanes"))
        : json({ ...without(list([]), "forecast"), milestones: [without(entry("m-1"), "lanes")] }),
    );
    const body = await fetchMilestones("alpha");
    expect(body.forecast).toBeNull();
    expect(body.milestones[0].lanes).toBeNull();
    expect((await fetchMilestone("alpha", "m-1", null)).lanes).toBeNull();
  });

  it("REQ-MILESTONE-UI-008 spec_confirmed: missing becomes null, a non-boolean is refused", async () => {
    const bare = Object.fromEntries(Object.entries(epicPlan("e-a")).filter(([k]) => k !== "spec_confirmed"));
    stubMilestones(() => json(detail([bare as unknown as ReturnType<typeof epicPlan>, epicPlan("e-b", { spec_confirmed: true })])));
    const epics = (await fetchMilestone("alpha", "m-1", null)).epics;
    expect(epics.map((e) => e.spec_confirmed)).toEqual([null, true]);
    stubMilestones(() => json(detail([{ ...epicPlan("e-a"), spec_confirmed: "yes" } as unknown as ReturnType<typeof epicPlan>])));
    await expect(fetchMilestone("alpha", "m-1", null)).rejects.toThrow("unexpected response");
  });

  it("REQ-MILESTONE-UI-008 refuses a malformed forecast", async () => {
    stubMilestones(() => json(list([], { forecast: { ...forecast(), lanes: "two" } as unknown as Forecast })));
    await expect(fetchMilestones("alpha")).rejects.toThrow("unexpected response");
  });

  it("builds milestone paths", () => {
    expect(milestonePath("al pha", "m-1")).toBe("/milestones/al%20pha/m-1");
    expect(milestonePath("alpha", "m-1", "graph", "2026-11-16")).toBe("/milestones/alpha/m-1?tab=graph&start=2026-11-16");
    expect(milestonePath("alpha", "m-1", "gantt", null, "2w")).toBe("/milestones/alpha/m-1?zoom=2w"); // REQ-MILESTONE-UI-011
    expect(milestonePath("alpha", "m-1", "gantt", null, "all")).toBe("/milestones/alpha/m-1");
  });
});
