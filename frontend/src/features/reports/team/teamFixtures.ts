import type { TeamBead, TeamFigures, TeamReport, TeamTotals } from "../teamApi";

const figures: TeamFigures = {
  scope: 4,
  closed: 1,
  in_progress: 1,
  open: 2,
  blocked: 1,
  unclaimed: 1,
  done: 0.25,
  throughput: 1,
  cycle_median: 1.5,
  oldest_in_progress: 4,
  on_time: 1,
  rework_rate: 0,
  reopens: 0,
  bugs: 0,
};

export const teamTotals: TeamTotals = { ...figures, working_days: 20, elapsed: 9, days_left: 11, pace: 3.6, pace_needed: 3.4, late_open: 0 };

const bead = (overrides: Partial<TeamBead>): TeamBead => ({
  id: "a-1",
  title: "Bead",
  issue_type: "task",
  status: "open",
  bucket: "open",
  assignee: "ann",
  priority: 2,
  created_at: "2026-11-02T09:00:00Z",
  epic: { id: "a-e1", title: "Epic one" },
  started_at: null,
  closed_at: null,
  cycle_days: null,
  age_days: null,
  late_days: null,
  rework: null,
  ...overrides,
});

export function teamReport(overrides: Partial<TeamReport> = {}): TeamReport {
  return {
    generated_at: "2026-11-12T10:00:00Z",
    project: "alpha",
    today: "2026-11-12",
    milestones: [
      { id: "m1", title: "Milestone one", status: "closed", start: "2026-10-12", end: "2026-10-30", closed_on: "2026-11-03" },
      { id: "m2", title: "Milestone two", status: "active", start: "2026-11-02", end: "2026-11-27", closed_on: null },
      { id: "m3", title: "Milestone three", status: "planned", start: "2026-11-30", end: "2026-12-18", closed_on: null },
    ],
    undated: 0,
    milestone: "m2",
    team: teamTotals,
    members: [
      { ...figures, member: "ann" },
      { ...figures, member: "Unassigned", scope: 1, closed: 0, in_progress: 0, open: 1 },
    ],
    days: [
      { date: "2026-11-10", closed: { ann: 1 } },
      { date: "2026-11-11", closed: {} },
      { date: "2026-11-12", closed: { ann: 1 } },
    ],
    beads: [
      bead({ id: "a-1", status: "open", bucket: "open", assignee: null }),
      bead({ id: "a-2", status: "in_progress", bucket: "in_progress", started_at: "2026-11-08T09:00:00Z", age_days: 4 }),
      bead({ id: "a-3", status: "closed", bucket: "closed", started_at: "2026-11-09T09:00:00Z", closed_at: "2026-11-10T09:00:00Z", cycle_days: 1 }),
      bead({ id: "a-4", status: "blocked", bucket: "open" }),
    ],
    ...overrides,
  };
}
