// TC: TC-REPORTS-088@7d36e3ae
import { test, expect } from '../evidence';
import { statusBody, stubReports, teamBody } from '../support/reports';

test('TC-REPORTS-088: Status section period, no milestones, not started and retry (REQ-REPORTS-032)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const alphaMilestones = [
    { id: 'm2', title: 'Checkout v2', status: 'active' as const, start: '2026-11-11', end: '2026-12-02', closed_on: null },
    { id: 'm3', title: 'Next release', status: 'planned' as const, start: '2026-12-18', end: '2027-01-15', closed_on: null },
  ];
  await stubReports(page, { projects: ['alpha', 'beta'] });

  let failOnce = false;
  await page.route('**/api/reports/team**', (route) => {
    const url = new URL(route.request().url());
    const project = url.searchParams.get('project') ?? 'alpha';
    if (project === 'beta') {
      return route.fulfill({ json: { ...teamBody('beta', { periodDays: 30 }), milestones: [], milestone: null } });
    }
    const days = url.searchParams.get('days');
    const ms = url.searchParams.get('milestone');
    return route.fulfill({
      json: {
        ...teamBody('alpha', days ? { periodDays: Number(days) } : { milestone: ms ?? 'm2' }),
        milestones: alphaMilestones,
      },
    });
  });

  await page.route('**/api/reports/status**', (route) => {
    const url = new URL(route.request().url());
    const project = url.searchParams.get('project') ?? 'alpha';
    const ms = url.searchParams.get('milestone');
    const days = url.searchParams.get('days');
    if (project === 'alpha' && ms === 'm2' && failOnce) {
      failOnce = false;
      return route.fulfill({ status: 502, json: { error: 'backend unavailable' } });
    }
    if (project === 'beta') {
      return route.fulfill({
        json: statusBody('beta', { today: '2026-11-23', milestones: [], milestone: null, days: 30, period: null, burnup: [], epics: [] }),
      });
    }
    if (days !== null) {
      return route.fulfill({
        json: statusBody('alpha', {
          today: '2026-11-23', milestones: alphaMilestones, milestone: null, days: Number(days), period: null,
          kpis: {
            beads: { done: 5, scope: null, done_week_ago: null, scope_week_ago: null },
            points: { done: null, scope: null, at_kickoff: null, done_week_ago: null },
            pace: { pace: null, pace_needed: null, pace_week_ago: null },
            blocked: { count: 1, oldest_days: null },
            rework: { rate: 0.2, rate_week_ago: null },
          },
          burnup: [], epics: [],
        }),
      });
    }
    if (ms === 'm3') {
      return route.fulfill({
        json: statusBody('alpha', {
          today: '2026-11-23', milestones: alphaMilestones, milestone: 'm3', period: null, burnup: [],
          kpis: {
            beads: { done: 0, scope: 0, done_week_ago: null, scope_week_ago: null },
            points: { done: 0, scope: 13, at_kickoff: 13, done_week_ago: null },
            pace: { pace: null, pace_needed: null, pace_week_ago: null },
            blocked: { count: 0, oldest_days: null },
            rework: { rate: null, rate_week_ago: null },
          },
          epics: [{
            id: 'e-3', title: 'Planned epic', status: 'open', points: 13, person: 'lead', closed_on: null,
            child_counts: { total: 0, closed: 0, in_progress: 0, blocked: 0, ready: 0, deferred: 0, prep_total: 0, prep_closed: 0 },
          }],
        }),
      });
    }
    return route.fulfill({ json: statusBody('alpha', { today: '2026-11-23', milestones: alphaMilestones, milestone: 'm2' }) });
  });

  await ev.step('1. Open `/reports/status?project=alpha&days=30`', async () => {
    await page.goto('/reports/status?project=alpha&days=30');
    const group = page.getByRole('group', { name: 'Key figures' });
    await expect(group.getByText('5 closed')).toBeVisible();
    await expect(group.getByText('20%')).toBeVisible();
    await expect(group.getByText('1', { exact: true })).toBeVisible();
    await expect(page.locator('[data-verdict-tone]')).toHaveCount(0);
    await expect(page.getByText('Pick a milestone to see the verdict, burn-up and epics')).toBeVisible();
  });

  await ev.step('2. Open `/reports/status?project=beta&days=30`', async () => {
    await page.goto('/reports/status?project=beta&days=30');
    await expect(page.getByText('beta has no milestones yet')).toBeVisible();
    await expect(page.getByText('gin milestone create')).toBeVisible();
  });

  await ev.step('3. Open `/reports/status?project=alpha&milestone=m3`', async () => {
    await page.goto('/reports/status?project=alpha&milestone=m3');
    const status = page.getByRole('region', { name: 'Status' });
    await expect(status.getByText('Not started', { exact: true })).toBeVisible();
    await expect(status.getByText('Starts 18 Dec', { exact: true })).toBeVisible();
  });

  await ev.step('4. With 502 on first request, open `/reports/status?project=alpha&milestone=m2` and press Retry', async () => {
    failOnce = true;
    await page.goto('/reports/status?project=alpha&milestone=m2');
    await expect(page.getByText('backend unavailable')).toBeVisible();
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Checkout v2' })).toBeVisible();
  });
});
