// TC: TC-REPORTS-084@4da9c406
import { test, expect } from '../evidence';
import { entry, list } from '../support/api';
import { stubReports } from '../support/reports';

test('TC-REPORTS-084: Status section heading, verdict panel and five KPI figures (REQ-REPORTS-028)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubReports(page, {
    projects: ['alpha'],
    milestones: list([
      entry('m2', { title: 'Checkout v2', status: 'active', start: '2026-11-11', end: '2026-12-02', finish: '2026-11-30' }),
    ], { today: '2026-11-23' }),
    status: {
      today: '2026-11-23',
      milestones: [{ id: 'm2', title: 'Checkout v2', status: 'active', start: '2026-11-11', end: '2026-12-02', closed_on: null }],
      milestone: 'm2',
      period: { kickoff: '2026-11-11', working_days: 16, elapsed: 8, days_left: 8 },
      kpis: {
        beads: { done: 13, scope: 35, done_week_ago: 7, scope_week_ago: 32 },
        points: { done: 0, scope: 27, at_kickoff: 24, done_week_ago: 0 },
        pace: { pace: 2.0, pace_needed: 2.8, pace_week_ago: 1.4 },
        blocked: { count: 2, oldest_days: 4 },
        rework: { rate: 0.31, rate_week_ago: 0.18 },
      },
    },
  });

  await ev.step('1. Open `/reports/status?project=alpha&milestone=m2`', async () => {
    await page.goto('/reports/status?project=alpha&milestone=m2');
    await expect(page.getByRole('heading', { level: 2, name: 'Checkout v2' })).toBeVisible();
    await expect(page.getByText('Milestone report, 11 Nov – 2 Dec. Working day 8 of 16.')).toBeVisible();

    const panel = page.locator('[data-verdict-tone="risk"]');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('data-verdict-wash', 'true');
    await expect(panel.getByText('At risk', { exact: true })).toBeVisible();

    const group = page.getByRole('group', { name: 'Key figures' });
    await expect(group.getByText('13 of 35')).toBeVisible();
    await expect(group.getByText('+6 this week')).toBeVisible();
    await expect(group.getByText('0 of 27')).toBeVisible();
    await expect(group.getByText('+3 added after kickoff')).toBeVisible();
    await expect(group.getByText('2.0 a day')).toBeVisible();
    await expect(group.getByText('needs 2.8 to end on 2 Dec')).toBeVisible();
    await expect(group.getByText('2', { exact: true })).toBeVisible();
    await expect(group.getByText('oldest waiting 4 days')).toBeVisible();
    await expect(group.getByText('31%')).toBeVisible();
    await expect(group.getByText('up from 18% last week')).toBeVisible();
  });
});
