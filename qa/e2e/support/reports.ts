// Stubbed report APIs for the specs of the Reports page (REQ-UI-088, 095, 129).
import type { Page } from '@playwright/test';
import { stubApi, type MilestoneList } from './api';

export type ReportOptions = {
  closed?: number; tokens?: number; cost?: number | null; reworkRate?: number | null;
  notCollected?: number; invalid?: number; unpriced?: number;
};

const figures = {
  scope: 4, closed: 1, in_progress: 1, open: 2, blocked: 0, unclaimed: 0, done: 0.25, throughput: 1,
  cycle_median: 1.5, oldest_in_progress: 4, on_time: 1, rework_rate: 0, reopens: 0, bugs: 0,
};

/** `GET /api/reports?project=…`, with the gaps and totals a case states. */
export const reportBody = (project: string, days = 30, o: ReportOptions = {}) => ({
  generated_at: '2026-11-12T10:00:00Z', project, days, sprint: null,
  totals: { tokens: o.tokens ?? 0, cost: o.cost ?? null, closed: o.closed ?? 0, tokens_per_bead: null, cache_ratio: null, rework_rate: o.reworkRate ?? null },
  usage: { members: [], epics: [], beads: [], stages: [], models: [] },
  delivery: { weeks: [], by_type: [], by_member: [], overall: { key: 'all', cycle: null, lead: null }, estimates: [] },
  quality: { members: [], epics: [], points: [] },
  coverage: {
    not_collected: Array.from({ length: o.notCollected ?? 0 }, (_, i) => ({ project, id: `${project}-n${i}`, title: `Not collected ${i}`, detail: 'not collected' })),
    invalid: Array.from({ length: o.invalid ?? 0 }, (_, i) => ({ project, id: `${project}-i${i}`, title: `Unreadable ${i}`, detail: 'unreadable' })),
    unpriced: Array.from({ length: o.unpriced ?? 0 }, (_, i) => `model-${i}`),
    unassigned_share: null, sources: [],
  },
  errors: [],
});

/** `GET /api/reports/team?project=…`: an open milestone with `closed` of `scope` beads closed. */
export const teamBody = (project: string, o: { closed?: number; scope?: number; pace?: number; paceNeeded?: number } = {}) => ({
  generated_at: '2026-11-12T10:00:00Z', project, today: '2026-11-12',
  milestones: [{ id: 'm2', title: 'Second', status: 'active', start: '2026-11-02', end: '2026-11-27', closed_on: null }],
  undated: 0, milestone: 'm2',
  team: { ...figures, scope: o.scope ?? 4, closed: o.closed ?? 1, working_days: 20, elapsed: 9, days_left: 11, pace: o.pace ?? 3.6, pace_needed: o.paceNeeded ?? 3.4, late_open: 0 },
  members: [], days: [], beads: [],
});

/** Stubs the projects and both report endpoints; `reports` lists the report calls (days) the page made. */
export async function stubReports(
  page: Page,
  opts: { projects?: string[]; report?: ReportOptions; team?: Parameters<typeof teamBody>[1]; milestones?: MilestoneList } = {},
) {
  const stub = await stubApi(page, { projects: opts.projects ?? ['alpha'], milestones: opts.milestones });
  await page.route('**/api/reports/team**', (route) => {
    const url = new URL(route.request().url());
    stub.calls.push(url);
    const project = url.searchParams.get('project') ?? '';
    return route.fulfill({ json: teamBody(project, opts.team) });
  });
  await page.route(/\/api\/reports\?/, (route) => {
    const url = new URL(route.request().url());
    stub.calls.push(url);
    const params = url.searchParams;
    return route.fulfill({ json: reportBody(params.get('project') ?? '', Number(params.get('days') ?? 30), opts.report) });
  });
  return stub;
}
