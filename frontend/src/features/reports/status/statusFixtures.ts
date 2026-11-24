import type { TeamMilestone } from "../teamApi";
import type { StatusEpic, StatusKpis, StatusReport } from "./statusApi";

export const statusMilestones: TeamMilestone[] = [
  { id: "m1", title: "Milestone one", status: "closed", start: "2026-10-05", end: "2026-10-30", closed_on: "2026-11-03" },
  { id: "m2", title: "Checkout v2", status: "active", start: "2026-11-11", end: "2026-12-02", closed_on: null },
  { id: "m3", title: "Next release", status: "planned", start: "2026-12-18", end: "2027-01-15", closed_on: null },
];

export const statusKpis = (over: Partial<StatusKpis> = {}): StatusKpis => ({
  beads: { done: 13, scope: 35, done_week_ago: 7, scope_week_ago: 32 },
  points: { done: 9.5, scope: 27, at_kickoff: 24, done_week_ago: 4 },
  pace: { pace: 2.0, pace_needed: 2.8, pace_week_ago: 1.4 },
  blocked: { count: 1, oldest_days: 4 },
  rework: { rate: 0.31, rate_week_ago: 0.18 },
  ...over,
});

export const statusEpic = (id: string, over: Partial<StatusEpic> = {}): StatusEpic => ({
  id,
  title: `Epic ${id}`,
  status: "in_progress",
  points: 5,
  person: "lead",
  closed_on: null,
  child_counts: { total: 4, closed: 2, in_progress: 1, blocked: 0, ready: 1, deferred: 0, prep_total: 0, prep_closed: 0 },
  ...over,
});

export const statusReport = (over: Partial<StatusReport> = {}): StatusReport => ({
  generated_at: "2026-11-23T12:00:00Z",
  project: "example",
  today: "2026-11-23",
  milestones: statusMilestones,
  undated: 0,
  milestone: "m2",
  days: null,
  period: { kickoff: "2026-11-11", working_days: 16, elapsed: 8, days_left: 8 },
  kpis: statusKpis(),
  burnup: [
    { day: "2026-11-11", scope_points: 24, done_points: 0 },
    { day: "2026-11-18", scope_points: 27, done_points: 6 },
    { day: "2026-11-23", scope_points: 27, done_points: 9.5 },
  ],
  changes: {
    scope_from: 24,
    scope_to: 27,
    items: [],
  },
  risks: {
    blocked: [],
    blocked_more: 0,
    unestimated: [],
  },
  epics: [statusEpic("e-1", { title: "Team checkout", points: 8 })],
  ...over,
});

export const periodStatusReport = (days = 30, over: Partial<StatusReport> = {}): StatusReport =>
  statusReport({
    milestone: null,
    days,
    period: null,
    kpis: {
      beads: { done: 5, scope: null, done_week_ago: null, scope_week_ago: null },
      points: { done: null, scope: null, at_kickoff: null, done_week_ago: null },
      pace: { pace: null, pace_needed: null, pace_week_ago: null },
      blocked: { count: 1, oldest_days: null },
      rework: { rate: 0.2, rate_week_ago: null },
    },
    burnup: [],
    changes: { scope_from: null, scope_to: null, items: [] },
    risks: { blocked: [], blocked_more: 0, unestimated: [] },
    epics: [],
    ...over,
  });
