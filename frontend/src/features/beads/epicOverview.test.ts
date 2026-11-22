import { describe, expect, it } from "vitest";
import type { BeadSummary } from "./api";
import { bead } from "./beadFixtures";
import { CHILDREN, E, E12, t1, t2, t3, t4, TRACKS } from "./epicFixtures";
import { epicProgress, laneRows, sortTracks, trackRows, workingDaysLeft, type TrackRow } from "./epicOverview";

describe("epicOverview", () => {
  it("REQ-UI-120 Progress by state: counts each state over the loaded tracks, not merge gates or prep", () => {
    const prep = bead(`${E}.11`, { parent: E, labels: ["prep"], status: "closed" });
    const p = epicProgress([...CHILDREN, prep]);
    expect(p.byState).toEqual({ done: 4, in_progress: 1, ready: 2, blocked: 1, deferred: 0 });
  });

  it("REQ-UI-120 Points: 3 and 3 closed, 5 in progress, others without points give 6 of 11", () => {
    const kids: BeadSummary[] = [
      bead("a", { status: "closed", points: 3 }),
      bead("b", { status: "in_progress", points: 5 }),
      bead("c", { status: "closed", points: 3 }),
      bead("d"),
    ];
    expect(epicProgress(kids).points).toEqual({ done: 6, total: 11 });
  });

  it("REQ-UI-120 No points: null when no track has points", () => {
    expect(epicProgress([bead("a"), bead("b", { status: "closed" })]).points).toBeNull();
  });

  it("REQ-UI-120 Milestone forecast late: working days from 20 Nov to 1 Dec 2026, both counted, is 8", () => {
    expect(workingDaysLeft("2026-11-20", "2026-12-01")).toBe(8);
    expect(workingDaysLeft("2026-11-21", "2026-11-22")).toBe(0);
    expect(workingDaysLeft("2026-11-20", "2026-11-20")).toBe(1);
    expect(workingDaysLeft("2026-12-02", "2026-12-01")).toBe(0);
  });

  it("REQ-UI-121 Lanes summary: rows in the Lanes view order with their states and counts", () => {
    const rows = laneRows(E12, E, new Date("2026-11-20T10:00:00Z"));
    expect(rows.map((r) => r.lane)).toEqual(["be", "fe", "infra", "qa", null]);
    expect(rows.find((r) => r.lane === "qa")?.tracks).toEqual({ closed: 0, total: 1 });
  });

  it("REQ-UI-121 Tracks table: 8 rows by id, no merge gate, and ex-e12.4 is Blocked with 'be #2 · merge pending'", () => {
    const rows = trackRows(E12, E);
    expect(rows.map((r) => r.id)).toEqual(TRACKS.map((t) => t.id));
    expect(rows.find((r) => r.id === t4.id)).toEqual({
      id: t4.id,
      title: "End-to-end checkout QA",
      state: "blocked",
      lane: "qa",
      assignee: null,
      points: 3,
      blockedBy: ["be #2 · merge pending"],
    });
    expect(rows.find((r) => r.id === t3.id)?.blockedBy).toEqual([]);
  });

  it("REQ-UI-121 Tracks table: ids sort naturally, ex-e12.10 after ex-e12.9", () => {
    const many = [bead("x.10", { parent: "x" }), bead("x.9", { parent: "x" }), bead("x.1", { parent: "x" })];
    expect(trackRows(many, "x").map((r) => r.id)).toEqual(["x.1", "x.9", "x.10"]);
  });

  it("REQ-UI-121 Sort by a column: state ascending then descending, empty values last", () => {
    const rows = trackRows(E12, E);
    const states = (list: TrackRow[]) => list.map((r) => r.state);
    const asc = sortTracks(rows, "state", "ascending");
    expect(states(asc)).toEqual(["done", "done", "done", "done", "in_progress", "ready", "ready", "blocked"]);
    expect(states(sortTracks(rows, "state", "descending"))).toEqual([...states(asc)].reverse());
    expect(sortTracks(rows, "assignee", "ascending").at(-1)?.assignee).toBeNull();
    expect(sortTracks(rows, "assignee", "descending").at(-1)?.assignee).toBeNull();
    expect(sortTracks(rows, "points", "descending")[0].points).toBe(5);
    expect(sortTracks(rows, "id", "descending")[0].id).toBe("ex-e12.8");
    expect(t1.id).toBe("ex-e12.1");
    expect(t2.status).toBe("in_progress");
  });
});
