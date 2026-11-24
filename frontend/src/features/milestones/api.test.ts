import { afterEach, describe, expect, it, vi } from "vitest";
import { json } from "@/features/beads/beadFixtures";
import { daysPerPointOf, fetchMilestone, fetchMilestones, milestonePath, MilestonesError, velocityOf, type Forecast } from "./api";
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

  it("REQ-MILESTONE-UI-008 accepts an entry without dates, keeping its error", async () => {
    stubMilestones(() => json(list([entry("m-4", { start: null, end: null, error: "M4 has no start/end metadata" })])));
    const [m4] = (await fetchMilestones("alpha")).milestones;
    expect([m4.start, m4.end, m4.error]).toEqual([null, null, "M4 has no start/end metadata"]);
  });

  it("REQ-MILESTONE-UI-008 refuses an unexpected shape", async () => {
    stubMilestones(() => json({ milestones: [{ id: 1 }], unassigned_epics: 0, today: "2026-10-29" }));
    await expect(fetchMilestones("alpha")).rejects.toThrow("unexpected response");
  });

  it("REQ-MILESTONE-UI-025 accepts epics with and without the state counts, and rejects a string", async () => {
    const plain = { total: 4, closed: 1 };
    const states = { ...plain, in_progress: 1, blocked: 1, ready: 1, deferred: 0 };
    for (const epics of [plain, states]) {
      stubMilestones(() => json(list([entry("m-1", { epics })])));
      expect((await fetchMilestones("alpha")).milestones[0].epics).toEqual(epics);
    }
    stubMilestones(() => json({ ...list([]), milestones: [{ ...entry("m-1"), epics: { ...plain, ready: "1" } }] }));
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

  it("REQ-MILESTONE-UI-008 reads schedule facts and defaults them for an older gin", async () => {
    const full = detail([epicPlan("e-a", { remaining_days: 2, assumed_days: 3, warnings: [{ code: "open_bugs", days: null, count: 2 }] })], {
      integration: "2026-11-24",
      deadline: "2026-11-28",
      away: { ann: ["2026-11-25"] },
    });
    stubMilestones(() => json(full));
    expect(await fetchMilestone("alpha", "m-1", null)).toEqual(full);
    const old = detail([epicPlan("e-a")]);
    const bare = (x: object, keys: string[]) => Object.fromEntries(Object.entries(x).filter(([k]) => !keys.includes(k)));
    const epic = bare(old.epics[0], ["remaining_days", "assumed_days"]);
    stubMilestones(() => json({ ...bare(old, ["integration", "deadline", "away"]), epics: [{ ...epic, warnings: [{ code: "late", days: null }] }] }));
    const got = await fetchMilestone("alpha", "m-1", null);
    expect([got.integration, got.deadline, got.away]).toEqual([null, null, {}]);
    expect([got.epics[0].remaining_days, got.epics[0].assumed_days, got.epics[0].warnings[0].count]).toEqual([null, null, null]);
    stubMilestones(() => json({ ...full, away: { ann: [1] } }));
    await expect(fetchMilestone("alpha", "m-1", null)).rejects.toBeInstanceOf(MilestonesError);
  });

  it("REQ-MILESTONE-UI-008 keeps the epics of the forecast, an epic without estimate_source reads as null", async () => {
    const epics = [
      { id: "e-1", milestone: "M1", planned_start: "2026-11-23", planned_end: "2026-11-25", estimate_source: "points" },
      { id: "e-5", milestone: null, planned_start: "2026-12-23", planned_end: "2027-01-01" },
      { id: "e-6", milestone: "M1", planned_start: "2026-12-24", planned_end: "2027-01-02", estimate_source: "future_source" },
    ] as unknown as Forecast["epics"];
    stubMilestones(() => json(list([entry("m-1")], { forecast: { ...forecast(), epics } })));
    const got = (await fetchMilestones("alpha")).forecast?.epics;
    expect(got).toEqual([
      { id: "e-1", milestone: "M1", planned_start: "2026-11-23", planned_end: "2026-11-25", estimate_source: "points" },
      { id: "e-5", milestone: null, planned_start: "2026-12-23", planned_end: "2027-01-01", estimate_source: null },
      { id: "e-6", milestone: "M1", planned_start: "2026-12-24", planned_end: "2027-01-02", estimate_source: null },
    ]);
  });

  it("REQ-MILESTONE-UI-008 a forecast without epics reads as an empty list", async () => {
    stubMilestones(() => json(list([entry("m-1")], { forecast: forecast() })));
    expect((await fetchMilestones("alpha")).forecast?.epics).toEqual([]);
  });

  it("REQ-MILESTONE-UI-008 refuses a malformed forecast", async () => {
    stubMilestones(() => json(list([], { forecast: { ...forecast(), lanes: "two" } as unknown as Forecast })));
    await expect(fetchMilestones("alpha")).rejects.toThrow("unexpected response");
  });

  it("builds milestone paths", () => {
    expect(milestonePath("al pha", "m-1")).toBe("/milestones/al%20pha/m-1");
    expect(milestonePath("alpha", "m-1", "beads", "2026-11-16")).toBe("/milestones/alpha/m-1?tab=beads&start=2026-11-16");
    expect(milestonePath("p", "m2", "retro", "2026-11-10", "2w")).toBe("/milestones/p/m2?tab=retro&start=2026-11-10&zoom=2w"); // REQ-MILESTONE-UI-019
    expect(milestonePath("p", "m2", "gantt", "2026-11-10", "2w")).toBe("/milestones/p/m2?start=2026-11-10&zoom=2w");
    // REQ-MILESTONE-UI-018: the Beads filters ride after tab, start and zoom; project and milestone are dropped
    expect(milestonePath("p", "m2", "beads", null, "all", "?view=board&status=open")).toBe("/milestones/p/m2?tab=beads&view=board&status=open");
    expect(milestonePath("p", "m2", "beads", null, "all", "project=x&milestone=m9&view=graph")).toBe("/milestones/p/m2?tab=beads&view=graph");
    expect(milestonePath("alpha", "m-1", "gantt", null, "2w")).toBe("/milestones/alpha/m-1?zoom=2w"); // REQ-MILESTONE-UI-011
    expect(milestonePath("alpha", "m-1", "gantt", null, "all")).toBe("/milestones/alpha/m-1");
  });

  const VELOCITY = { committed_points: 13, completed_points: 8, added_points: 3, say_do: 0.62, days_per_point: 1.4, planned_days_per_point: 1.2, accuracy: 0.86 };

  it("REQ-MILESTONE-UI-008 reads days per point, velocity and the points of an epic", async () => {
    stubMilestones((url) =>
      url.pathname.endsWith("/m-1")
        ? json(detail([epicPlan("e-a", { points: 5, points_reason: "new UI", estimate_source: "points", actual_days: 7, actual_days_per_point: 1.4 })], { days_per_point: { value: 1.4, measured_epics: 3, assumed: false }, velocity: VELOCITY }))
        : json(list([entry("m-1", { velocity: VELOCITY })], { days_per_point: { value: 1, measured_epics: 0, assumed: true } })),
    );
    const body = await fetchMilestones("alpha");
    expect(body.days_per_point).toEqual({ value: 1, measured_epics: 0, assumed: true });
    expect(body.milestones[0].velocity).toEqual(VELOCITY);
    const shown = await fetchMilestone("alpha", "m-1", null);
    expect(shown.velocity).toEqual(VELOCITY);
    expect(shown.days_per_point?.value).toBe(1.4);
    expect(shown.epics[0]).toMatchObject({ points: 5, points_reason: "new UI", estimate_source: "points", actual_days: 7, actual_days_per_point: 1.4 });
  });

  it("REQ-MILESTONE-UI-008 older output: the points keys read as null", async () => {
    const bare = (x: object, keys: string[]) => Object.fromEntries(Object.entries(x).filter(([k]) => !keys.includes(k)));
    const epicKeys = ["points", "points_reason", "estimate_source", "actual_days", "actual_days_per_point"];
    stubMilestones((url) =>
      url.pathname.endsWith("/m-1")
        ? json({ ...bare(detail([]), ["velocity", "days_per_point"]), epics: [bare(epicPlan("e-a"), epicKeys)] })
        : json({ ...bare(list([]), ["days_per_point"]), milestones: [bare(entry("m-1"), ["velocity"])] }),
    );
    const body = await fetchMilestones("alpha");
    expect(body.days_per_point).toBeNull();
    expect(body.milestones[0].velocity).toBeNull();
    const shown = await fetchMilestone("alpha", "m-1", null);
    expect(shown.velocity).toBeNull();
    expect(shown.days_per_point).toBeNull();
    expect(shown.epics[0]).toMatchObject({ points: null, points_reason: null, estimate_source: null, actual_days: null, actual_days_per_point: null });
  });

  it("REQ-MILESTONE-UI-008 a malformed velocity or days per point reads as null and the page still loads", async () => {
    stubMilestones(() => json({ ...list([]), milestones: [{ ...entry("m-1"), velocity: { say_do: "high" } }], days_per_point: "1.4" }));
    const body = await fetchMilestones("alpha");
    expect(body.milestones[0].velocity).toBeNull();
    expect(body.days_per_point).toBeNull();
    expect(velocityOf(null)).toBeNull();
    expect(velocityOf({ ...VELOCITY, say_do: undefined })?.say_do).toBeNull();
    expect(daysPerPointOf({ value: "x" })).toBeNull();
    expect(daysPerPointOf({ value: 1.4 })).toEqual({ value: 1.4, measured_epics: 0, assumed: false });
  });
});
