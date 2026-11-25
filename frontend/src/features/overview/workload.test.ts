import { describe, expect, it } from "vitest";
import type { ProjectOverview } from "./api";
import { workloadOf } from "./workload";

const project = (name: string, assignees: (string | null)[]): ProjectOverview => ({
  name,
  error: null,
  stale: false,
  milestone: null,
  blocked: [],
  aging: [],
  unassigned: [],
  in_progress: assignees.map((assignee, i) => ({ id: `${name}-${i}`, title: "T", assignee })),
  epics: [],
});

describe("workloadOf", () => {
  it("REQ-OVERVIEW-005 merges spellings of one person across projects and counts per project", () => {
    const rows = workloadOf([project("a", ["Bob@x.com", "bob"]), project("b", ["bob"])]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ person: "bob", total: 3, perProject: [{ project: "a", count: 2 }, { project: "b", count: 1 }] });
  });

  it("REQ-OVERVIEW-005 sorts highest total first, then by name, with Unassigned last", () => {
    const rows = workloadOf([project("a", [null, null, null, "zed", "amy", "kim", "kim"])]);
    expect(rows.map((r) => r.person)).toEqual(["kim", "amy", "zed", null]);
  });

  it("REQ-OVERVIEW-005 returns nothing without work in progress", () => {
    expect(workloadOf([project("a", [])])).toEqual([]);
  });
});
