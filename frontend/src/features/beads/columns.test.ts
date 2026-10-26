import { describe, expect, it } from "vitest";
import { bead } from "./beadFixtures";
import {
  boardColumns,
  closedNewestFirst,
  focusColumns,
  focusRows,
} from "./columns";

const ids = (beads: { id: string }[]) => beads.map((b) => b.id);

describe("columns", () => {
  // REQ-UI-031
  it("REQ-UI-031 puts each bead in the first column that fits", () => {
    const columns = boardColumns([
      bead("d", { status: "deferred" }),
      bead("r", { ready: true }),
      bead("p", { status: "in_progress" }),
      bead("h", { status: "hooked" }),
      bead("b", { blocked: true }),
      bead("pb", { status: "in_progress", blocked: true }),
      bead("c", { status: "closed", closed_at: "2026-10-15T00:00:00Z" }),
    ]);
    expect(ids(columns.backlog)).toEqual(["d"]);
    expect(ids(columns.ready)).toEqual(["r"]);
    expect(ids(columns.in_progress).sort()).toEqual(["h", "p", "pb"]);
    expect(ids(columns.blocked)).toEqual(["b"]);
    expect(ids(columns.done)).toEqual(["c"]);
  });

  // REQ-UI-031
  it("REQ-UI-031 leaves a bead that fits no column out of the board", () => {
    const columns = boardColumns([bead("x", { status: "pinned" }), bead("y")]);
    expect(Object.values(columns).flat()).toEqual([]);
  });

  // REQ-UI-031
  it("REQ-UI-031 orders a column by priority, then newest update; Done by closing time", () => {
    const columns = boardColumns([
      bead("old", { ready: true, priority: 1, updated_at: "2026-10-01T00:00:00Z" }),
      bead("new", { ready: true, priority: 1, updated_at: "2026-10-09T00:00:00Z" }),
      bead("low", { ready: true, priority: 3, updated_at: "2026-10-10T00:00:00Z" }),
      bead("c1", { status: "closed", closed_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-20T00:00:00Z" }),
      bead("c2", { status: "closed", closed_at: "2026-10-05T00:00:00Z", updated_at: "2026-10-02T00:00:00Z" }),
      bead("c3", { status: "closed", closed_at: null, updated_at: "2026-10-03T00:00:00Z" }),
    ]);
    expect(ids(columns.ready)).toEqual(["new", "old", "low"]);
    expect(ids(columns.done)).toEqual(["c2", "c3", "c1"]);
  });

  // REQ-UI-032
  it("REQ-UI-032 closedNewestFirst sorts by closed_at and falls back to updated_at", () => {
    const sorted = closedNewestFirst([
      bead("a", { status: "closed", closed_at: "2026-10-01T00:00:00Z" }),
      bead("b", { status: "closed", closed_at: null, updated_at: "2026-10-09T00:00:00Z" }),
      bead("open"),
    ]);
    expect(ids(sorted)).toEqual(["b", "a"]);
  });

  // REQ-UI-033
  it("REQ-UI-033 focus columns: in flight, blocked, next up (ready P0/P1)", () => {
    const columns = focusColumns([
      bead("p", { status: "in_progress" }),
      bead("h", { status: "hooked" }),
      bead("b", { blocked: true }),
      bead("pb", { status: "in_progress", blocked: true }),
      bead("n1", { ready: true, priority: 1 }),
      bead("n0", { ready: true, priority: 0 }),
      bead("n3", { ready: true, priority: 3 }),
      bead("c", { status: "closed" }),
    ]);
    expect(ids(columns.in_flight).sort()).toEqual(["h", "p", "pb"]);
    expect(ids(columns.blocked)).toEqual(["b"]);
    expect(ids(columns.next_up)).toEqual(["n0", "n1"]);
  });

  // REQ-UI-034
  it("REQ-UI-034 one row per assignee that has work, 'No assignee' last, empty rows left out", () => {
    const rows = focusRows(
      [
        bead("1", { assignee: "bob", status: "in_progress" }),
        bead("2", { assignee: "alice", blocked: true }),
        bead("3", { assignee: null, ready: true, priority: 0 }),
        bead("4", { assignee: "  ", ready: true, priority: 1 }),
        bead("5", { assignee: "carol", ready: true, priority: 3 }),
      ],
      "assignee",
    );
    expect(rows.map((r) => r.title)).toEqual(["alice", "bob", "No assignee"]);
    expect(ids(rows[2]?.columns.next_up ?? []).sort()).toEqual(["3", "4"]);
  });

  // REQ-UI-034
  it("REQ-UI-034 without grouping there is one untitled row, even when empty", () => {
    expect(focusRows([], "")).toEqual([
      { title: null, columns: { in_flight: [], blocked: [], next_up: [] } },
    ]);
  });
});
