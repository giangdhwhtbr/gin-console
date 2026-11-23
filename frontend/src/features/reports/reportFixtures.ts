import type { Report } from "./api";

export function report(overrides: Partial<Report> = {}): Report {
  return {
    generated_at: "2026-11-01T10:00:00Z",
    project: "alpha",
    days: 30,
    sprint: null,
    totals: { closed: 4, rework_rate: 0.25 },
    delivery: { weeks: [{ week: "2026-W44", counts: { task: 3 } }], by_type: [], by_member: [], overall: { key: "all", cycle: null, lead: null }, estimates: [] },
    quality: {
      members: [{ member: "ann", closed: 4, reopens: 1, bugs: 0, rework_rate: 0.25 }],
      epics: [{ project: "alpha", id: "a-e1", title: "Epic one", closed: 2, reopens: 1, bugs: 0, rework_rate: 0.5 }],
    },
    ...overrides,
  };
}
