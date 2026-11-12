import { describe, expect, it } from "vitest";
import { ageOf, COLUMNS, DEFAULT_SORT, sortBeads } from "./beadSort";
import { teamReport } from "./teamFixtures";
import type { TeamBead } from "../teamApi";

const base = teamReport().beads[0];
const bead = (over: Partial<TeamBead>): TeamBead => ({ ...base, ...over });
const ids = (beads: TeamBead[]) => beads.map((b) => b.id);
const today = "2026-11-12";

describe("beadSort", () => {
  it("open default: priority ascending, then the oldest first", () => {
    const beads = [
      bead({ id: "p2-new", priority: 2, created_at: "2026-11-05T00:00:00Z" }),
      bead({ id: "p1", priority: 1 }),
      bead({ id: "p2-old", priority: 2, created_at: "2026-11-01T00:00:00Z" }),
    ];
    const { column, dir } = DEFAULT_SORT.open;
    expect(ids(sortBeads(beads, column, dir, today))).toEqual(["p1", "p2-old", "p2-new"]);
  });

  it("in progress default: longest first", () => {
    const beads = [bead({ id: "a", age_days: 1 }), bead({ id: "b", age_days: 5 })];
    const { column, dir } = DEFAULT_SORT.in_progress;
    expect(ids(sortBeads(beads, column, dir, today))).toEqual(["b", "a"]);
  });

  it("closed default: newest first", () => {
    const beads = [bead({ id: "a", closed_at: "2026-11-02T00:00:00Z" }), bead({ id: "b", closed_at: "2026-11-09T00:00:00Z" })];
    const { column, dir } = DEFAULT_SORT.closed;
    expect(ids(sortBeads(beads, column, dir, today))).toEqual(["b", "a"]);
  });

  it("nulls last in both directions", () => {
    const beads = [bead({ id: "none", priority: null }), bead({ id: "p1", priority: 1 }), bead({ id: "p3", priority: 3 })];
    expect(ids(sortBeads(beads, "priority", 1, today))).toEqual(["p1", "p3", "none"]);
    expect(ids(sortBeads(beads, "priority", -1, today))).toEqual(["p3", "p1", "none"]);
  });

  it("age sorts by days: descending puts the oldest first", () => {
    const beads = [bead({ id: "new", created_at: "2026-11-10T00:00:00Z" }), bead({ id: "old", created_at: "2026-11-01T00:00:00Z" })];
    expect(ids(sortBeads(beads, "age", -1, today))).toEqual(["old", "new"]);
    expect(ids(sortBeads(beads, "age", 1, today))).toEqual(["new", "old"]);
  });

  it("ageOf counts days from creation to today and each status has its columns", () => {
    expect(ageOf(bead({ created_at: "2026-11-10T00:00:00Z" }), today)).toBe(2);
    expect(COLUMNS.in_progress).toEqual(["bead", "epic", "type", "assignee", "progress"]);
  });
});
