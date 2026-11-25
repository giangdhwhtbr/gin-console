import { describe, expect, it } from "vitest";
import type { ProjectOverview } from "./api";
import { agingRows, blockedRows, unassignedRows } from "./merge";

const project = (name: string, part: Partial<ProjectOverview>): ProjectOverview => ({
  name,
  error: null,
  stale: false,
  milestone: null,
  blocked: [],
  aging: [],
  unassigned: [],
  in_progress: [],
  epics: [],
  ...part,
});
const aged = (id: string, days: number) => ({ id, title: "T", assignee: null, days });

describe("merge", () => {
  it("REQ-OVERVIEW-002 orders blocked beads of two projects by days waiting, then id, then project", () => {
    const rows = blockedRows([
      project("b", { blocked: [{ ...aged("x-1", 5), blocker: null }, { ...aged("x-2", 9), blocker: null }] }),
      project("a", { blocked: [{ ...aged("x-1", 5), blocker: null }] }),
    ]);
    expect(rows.map((r) => `${r.project}:${r.bead.id}`)).toEqual(["b:x-2", "a:x-1", "b:x-1"]);
  });

  it("REQ-OVERVIEW-003 orders aging beads by days, longest first", () => {
    const rows = agingRows([project("a", { aging: [aged("a-1", 8)] }), project("b", { aging: [aged("b-1", 12)] })]);
    expect(rows.map((r) => r.bead.id)).toEqual(["b-1", "a-1"]);
  });

  it("REQ-OVERVIEW-004 orders unassigned by priority, unprioritised last and ties by id", () => {
    const rows = unassignedRows([
      project("a", { unassigned: [{ id: "a-2", title: "T", priority: null }, { id: "a-1", title: "T", priority: null }, { id: "a-3", title: "T", priority: 1 }] }),
      project("b", { unassigned: [{ id: "b-1", title: "T", priority: 0 }] }),
    ]);
    expect(rows.map((r) => r.bead.id)).toEqual(["b-1", "a-3", "a-1", "a-2"]);
  });
});
