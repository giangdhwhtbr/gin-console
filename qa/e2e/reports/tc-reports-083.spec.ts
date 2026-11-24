// TC: TC-REPORTS-083@a5d38f70
import { test, expect } from '../evidence';
import { entry, list } from '../support/api';
import { statusBody, stubReports } from '../support/reports';

test('TC-REPORTS-083: Status verdict and sentence across milestone states (REQ-REPORTS-027)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const milestones = [
    { id: 'm1', title: 'First', status: 'closed' as const, start: '2026-10-05', end: '2026-10-30', closed_on: '2026-11-03' },
    { id: 'm2', title: 'Checkout v2', status: 'active' as const, start: '2026-11-11', end: '2026-12-02', closed_on: null },
    { id: 'm3', title: 'Next release', status: 'planned' as const, start: '2026-12-18', end: '2027-01-15', closed_on: null },
    { id: 'm4', title: 'Late release', status: 'active' as const, start: '2026-11-11', end: '2026-12-02', closed_on: null },
  ];
  const unsplitEpic = (id: string) => ({
    id, title: `Epic ${id}`, status: 'open', points: 5, person: 'lead', closed_on: null,
    child_counts: { total: 0, closed: 0, in_progress: 0, blocked: 0, ready: 0, deferred: 0, prep_total: 0, prep_closed: 0 },
  });

  await stubReports(page, {
    projects: ['alpha'],
    milestones: list([
      entry('m1', { status: 'closed', start: '2026-10-05', end: '2026-10-30', finish: '2026-10-30' }),
      entry('m2', { status: 'active', start: '2026-11-11', end: '2026-12-02', finish: '2026-11-30' }),
      entry('m3', { status: 'planned', start: '2026-12-18', end: '2027-01-15', finish: '2027-01-15' }),
      entry('m4', { status: 'active', start: '2026-11-11', end: '2026-12-02', finish: '2027-02-17' }),
    ], { today: '2026-11-23' }),
  });

  await page.route('**/api/reports/status**', (route) => {
    const id = new URL(route.request().url()).searchParams.get('milestone') ?? 'm2';
    const base = { today: '2026-11-23', milestones, milestone: id };
    if (id === 'm2') {
      return route.fulfill({
        json: statusBody('alpha', {
          ...base,
          kpis: {
            beads: { done: 15, scope: 35, done_week_ago: 10, scope_week_ago: 35 },
            points: { done: 9, scope: 24, at_kickoff: 24, done_week_ago: 4 },
            pace: { pace: 2.0, pace_needed: 2.8, pace_week_ago: 1.8 },
            blocked: { count: 1, oldest_days: 3 },
            rework: { rate: 0.1, rate_week_ago: 0.1 },
          },
          epics: [unsplitEpic('e-1'), unsplitEpic('e-2'), unsplitEpic('e-3'), unsplitEpic('e-4')],
        }),
      });
    }
    if (id === 'm3') {
      return route.fulfill({
        json: statusBody('alpha', {
          ...base,
          period: null,
          burnup: [],
          kpis: {
            beads: { done: 0, scope: 0, done_week_ago: null, scope_week_ago: null },
            points: { done: 0, scope: 13, at_kickoff: 13, done_week_ago: null },
            pace: { pace: null, pace_needed: null, pace_week_ago: null },
            blocked: { count: 0, oldest_days: null },
            rework: { rate: null, rate_week_ago: null },
          },
          epics: [unsplitEpic('e-3')],
        }),
      });
    }
    if (id === 'm1') {
      return route.fulfill({
        json: statusBody('alpha', {
          ...base,
          kpis: {
            beads: { done: 10, scope: 10, done_week_ago: 10, scope_week_ago: 10 },
            points: { done: 10, scope: 10, at_kickoff: 10, done_week_ago: 10 },
            pace: { pace: 2.0, pace_needed: null, pace_week_ago: 2.0 },
            blocked: { count: 0, oldest_days: null },
            rework: { rate: 0, rate_week_ago: 0 },
          },
        }),
      });
    }
    return route.fulfill({
      json: statusBody('alpha', {
        ...base,
        kpis: {
          beads: { done: 10, scope: 30, done_week_ago: 8, scope_week_ago: 30 },
          points: { done: 5, scope: 25, at_kickoff: 25, done_week_ago: 4 },
          pace: { pace: 2.0, pace_needed: 2.8, pace_week_ago: 2.0 },
          blocked: { count: 0, oldest_days: null },
          rework: { rate: 0, rate_week_ago: 0 },
        },
      }),
    });
  });

  const status = page.getByRole('region', { name: 'Status' });

  await ev.step('1. Open `/reports/status?project=alpha&milestone=m2`', async () => {
    await page.goto('/reports/status?project=alpha&milestone=m2');
    await expect(status.getByText('At risk', { exact: true })).toBeVisible();
    await expect(status.getByText(
      "At today's pace the 20 open beads close around 7 Dec, 3 working days after the end. The epic estimates finish on 30 Nov; 4 epics are not split into tasks yet.",
    )).toBeVisible();
  });

  await ev.step('2. Open `/reports/status?project=alpha&milestone=m3`', async () => {
    await page.goto('/reports/status?project=alpha&milestone=m3');
    await expect(status.getByText('Not started', { exact: true })).toBeVisible();
    await expect(status.getByText('Starts on 18 Dec, with 13 points planned.')).toBeVisible();
  });

  await ev.step('3. Open `/reports/status?project=alpha&milestone=m1`', async () => {
    await page.goto('/reports/status?project=alpha&milestone=m1');
    await expect(status.getByText('Finished 2 d late', { exact: true })).toBeVisible();
    await expect(status.getByText('Closed on 3 Nov, 2 working days after the end.')).toBeVisible();
  });

  await ev.step('4. Open `/reports/status?project=alpha&milestone=m4`', async () => {
    await page.goto('/reports/status?project=alpha&milestone=m4');
    await expect(status.getByText('Late', { exact: true })).toBeVisible();
  });
});
