import type { Report } from "./api";

export function report(overrides: Partial<Report> = {}): Report {
  return {
    generated_at: "2026-11-01T10:00:00Z",
    project: "all",
    days: 30,
    sprint: null,
    totals: { tokens: 51136800, cost: 12.34, closed: 4, tokens_per_bead: 12784200, cache_ratio: 0.9, rework_rate: 0.25 },
    usage: {
      members: [
        { member: "alice", closed: 4, tokens: 51136800, cost: 12.34, tokens_per_bead: 12784200, cache_ratio: 0.9, stages: { implement: 40000000 } },
      ],
      epics: [
        { project: "alpha", id: "a-1", title: "Epic one", status: "open", tokens: 1000, cost: 1, children: 2, closed_children: 1, budget: null },
      ],
      beads: [{ project: "alpha", id: "a-2", title: "Bead two", issue_type: "task", assignee: "alice", tokens: 500, cost: 0.5 }],
      stages: [
        { stage: "implement", tokens: 40000000, cost: 10 },
        { stage: "review", tokens: 11136800, cost: 2.34 },
      ],
      models: [
        { model: "opus", role: "developer", input: 1, output: 2, cache_read: 3, cache_write: 4, tokens: 10, cost: 1 },
      ],
    },
    delivery: { weeks: [{ week: "2026-W44", counts: { task: 3 } }], by_type: [], by_member: [], overall: { key: "all", cycle: null, lead: null }, wip: [], oldest: [], estimates: [] },
    quality: {
      members: [],
      epics: [],
      points: [{ project: "alpha", id: "a-2", title: "Bead two", tokens: 500, rework: 1 }],
    },
    coverage: { not_collected: [], invalid: [], unpriced: [], unassigned_share: null, sources: [] },
    errors: [],
    ...overrides,
  };
}
