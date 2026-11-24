// Stubbed report APIs for the specs of the Reports page (REQ-UI-088, 095, 129, REQ-REPORTS-020..034).
import type { Page } from '@playwright/test';
import { stubApi, type MilestoneList } from './api';

export type ReportOptions = {
  milestone?: string | null;
  closed?: number; reworkRate?: number | null;
  members?: { member: string; closed: number; reopens: number; bugs: number; rework_rate: number | null }[];
  epics?: { project: string; id: string; title: string; closed: number; reopens: number; bugs: number; rework_rate: number | null }[];
};

export type TeamOptions = {
  closed?: number; scope?: number; pace?: number; paceNeeded?: number | null;
  milestone?: string | null; periodDays?: number | null;
  pointsDelivered?: number; accuracy?: number | null;
  trend?: { id: string; title: string; start: string; end: string; closed: number; points_delivered: number; on_time: number | null; rework_rate: number | null; accuracy: number | null }[];
  unassigned?: { closed: number; total: number };
};

export type StatusOptions = {
  today?: string;
  milestones?: { id: string; title: string; status: 'active' | 'scheduled' | 'planned' | 'closed'; start: string; end: string; closed_on: string | null }[];
  undated?: number;
  milestone?: string | null;
  days?: number | null;
  period?: { kickoff: string | null; working_days: number; elapsed: number; days_left: number } | null;
  kpis?: Partial<{
    beads: { done: number | null; scope: number | null; done_week_ago: number | null; scope_week_ago: number | null };
    points: { done: number | null; scope: number | null; at_kickoff: number | null; done_week_ago: number | null };
    pace: { pace: number | null; pace_needed: number | null; pace_week_ago: number | null };
    blocked: { count: number; oldest_days: number | null };
    rework: { rate: number | null; rate_week_ago: number | null };
  }>;
  burnup?: { day: string; scope_points: number; done_points: number }[];
  changes?: {
    scope_from: number | null;
    scope_to: number | null;
    items: {
      day: string;
      kind: 'epic_added' | 'epic_removed' | 'estimated' | 're_estimated' | 'bug_added';
      id: string;
      title: string;
      points: number | null;
      from: number | null;
      to: number | null;
      epic: { id: string; title: string } | null;
      person: string | null;
    }[];
  };
  risks?: {
    blocked: { id: string; title: string; days: number; blocker: { id: string; title: string; person: string; blocked: boolean } | null }[];
    blocked_more: number;
    unestimated: { id: string; title: string }[];
  };
  epics?: {
    id: string;
    title: string;
    status: string;
    points: number | null;
    person: string;
    closed_on: string | null;
    child_counts: { total: number; closed: number; in_progress: number; blocked: number; ready: number; deferred: number; prep_total: number; prep_closed: number };
  }[];
};

const defaultMilestones = [{ id: 'm2', title: 'Second', status: 'active' as const, start: '2026-11-02', end: '2026-11-27', closed_on: null }];

const figures = {
  scope: 4, closed: 1, in_progress: 1, open: 2, blocked: 0, unclaimed: 0, done: 0.25, throughput: 1,
  cycle_median: 1.5, oldest_in_progress: 4, on_time: 1, rework_rate: 0, reopens: 0, bugs: 0,
  points_delivered: 0, accuracy: null as number | null,
};

/** `GET /api/reports?project=…`, with the totals and Rework rows a case states. */
export const reportBody = (project: string, days: number | null = 30, o: ReportOptions = {}) => ({
  generated_at: '2026-11-12T10:00:00Z', project,
  days: o.milestone ? null : days,
  milestone: o.milestone ?? null,
  totals: { closed: o.closed ?? 0, rework_rate: o.reworkRate ?? null },
  delivery: { weeks: [], by_type: [], by_member: [], overall: { key: 'all', cycle: null, lead: null }, estimates: [] },
  quality: { members: o.members ?? [], epics: o.epics ?? [] },
});

/** `GET /api/reports/team?project=…`: an open milestone with `closed` of `scope` beads closed. */
export const teamBody = (project: string, o: TeamOptions = {}) => {
  const periodDays = o.periodDays ?? null;
  const milestone = periodDays !== null ? null : (o.milestone !== undefined ? o.milestone : 'm2');
  return {
    generated_at: '2026-11-12T10:00:00Z', project, today: '2026-11-12',
    milestones: defaultMilestones,
    undated: 0, milestone, period_days: periodDays,
    team: {
      ...figures,
      scope: o.scope ?? 4,
      closed: o.closed ?? 1,
      points_delivered: o.pointsDelivered ?? 0,
      accuracy: o.accuracy ?? null,
      working_days: periodDays !== null ? null : 20,
      elapsed: periodDays !== null ? null : 9,
      days_left: periodDays !== null ? null : 11,
      pace: o.pace ?? 3.6,
      pace_needed: periodDays !== null ? null : (o.paceNeeded !== undefined ? o.paceNeeded : 3.4),
      late_open: 0,
    },
    members: [], days: [], beads: [],
    trend: o.trend ?? [],
    unassigned: o.unassigned ?? { closed: 0, total: o.closed ?? 1 },
  };
};

/** `GET /api/reports/status?project=…`: an active milestone with default status KPIs and burn-up. */
export const statusBody = (project: string, o: StatusOptions = {}) => {
  const days = o.days ?? null;
  const milestone = days !== null ? null : (o.milestone !== undefined ? o.milestone : 'm2');
  const defaultKpis = days !== null
    ? {
        beads: { done: 5, scope: null, done_week_ago: null, scope_week_ago: null },
        points: { done: null, scope: null, at_kickoff: null, done_week_ago: null },
        pace: { pace: null, pace_needed: null, pace_week_ago: null },
        blocked: { count: 0, oldest_days: null },
        rework: { rate: 0, rate_week_ago: null },
      }
    : {
        beads: { done: 1, scope: 4, done_week_ago: 0, scope_week_ago: 4 },
        points: { done: 3, scope: 12, at_kickoff: 12, done_week_ago: 0 },
        pace: { pace: 3.6, pace_needed: 3.4, pace_week_ago: 3.0 },
        blocked: { count: 0, oldest_days: null },
        rework: { rate: 0, rate_week_ago: 0 },
      };
  return {
    generated_at: '2026-11-12T10:00:00Z',
    project,
    today: o.today ?? '2026-11-12',
    milestones: o.milestones ?? defaultMilestones,
    undated: o.undated ?? 0,
    milestone,
    days,
    period: o.period !== undefined
      ? o.period
      : (days !== null ? null : { kickoff: '2026-11-02', working_days: 20, elapsed: 9, days_left: 11 }),
    kpis: { ...defaultKpis, ...o.kpis },
    burnup: o.burnup ?? (days !== null ? [] : [
      { day: '2026-11-02', scope_points: 12, done_points: 0 },
      { day: '2026-11-12', scope_points: 12, done_points: 3 },
    ]),
    changes: o.changes ?? { scope_from: days !== null ? null : 12, scope_to: days !== null ? null : 12, items: [] },
    risks: o.risks ?? { blocked: [], blocked_more: 0, unestimated: [] },
    epics: o.epics ?? [],
  };
};

/** Stubs the projects and report endpoints (`/api/reports/status`, `/api/reports/team`, `/api/reports`). */
export async function stubReports(
  page: Page,
  opts: {
    projects?: string[];
    report?: ReportOptions;
    team?: TeamOptions;
    status?: StatusOptions;
    milestones?: MilestoneList;
  } = {},
) {
  const stub = await stubApi(page, { projects: opts.projects ?? ['alpha'], milestones: opts.milestones });
  await page.route('**/api/reports/status**', (route) => {
    const url = new URL(route.request().url());
    stub.calls.push(url);
    const params = url.searchParams;
    const project = params.get('project') ?? '';
    const daysParam = params.get('days');
    const msParam = params.get('milestone');
    const scopeOpts: StatusOptions = daysParam !== null
      ? { days: Number(daysParam), milestone: null }
      : msParam !== null
        ? { milestone: msParam, days: null }
        : {};
    return route.fulfill({ json: statusBody(project, { ...scopeOpts, ...opts.status }) });
  });
  await page.route('**/api/reports/team**', (route) => {
    const url = new URL(route.request().url());
    stub.calls.push(url);
    const params = url.searchParams;
    const project = params.get('project') ?? '';
    const daysParam = params.get('days');
    const msParam = params.get('milestone');
    const scopeOpts: TeamOptions = daysParam !== null
      ? { periodDays: Number(daysParam), milestone: null }
      : msParam !== null
        ? { milestone: msParam, periodDays: null }
        : {};
    return route.fulfill({ json: teamBody(project, { ...scopeOpts, ...opts.team }) });
  });
  await page.route(/\/api\/reports\?/, (route) => {
    const url = new URL(route.request().url());
    stub.calls.push(url);
    const params = url.searchParams;
    const ms = params.get('milestone');
    const days = params.get('days');
    return route.fulfill({
      json: reportBody(
        params.get('project') ?? '',
        days !== null ? Number(days) : (ms ? null : 30),
        { ...opts.report, milestone: ms ?? opts.report?.milestone ?? null },
      ),
    });
  });
  return stub;
}
