// TC: TC-UI-028@e5d71d21
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-028: Headlines', async ({ page, ev }) => {
  // Precondition: active milestone m2 at risk, report with 41 closed beads and rework rate 0.09, bugs report with 3 open bugs; window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, {
    projects: ['alpha'],
    report: { closed: 41, reworkRate: 0.09 },
    status: {
      kpis: {
        beads: { done: 10, scope: 30, done_week_ago: 5, scope_week_ago: 30 },
        points: { done: 5, scope: 20, at_kickoff: 20, done_week_ago: 2 },
        pace: { pace: 2.0, pace_needed: 3.4, pace_week_ago: 2.0 },
        blocked: { count: 1, oldest_days: 3 },
        rework: { rate: 0.09, rate_week_ago: 0.09 },
      },
    },
  });

  await ev.step('1. Open `/reports/status?project=alpha&milestone=m2`', async () => {
    await page.goto('/reports/status?project=alpha&milestone=m2');
    const status = page.getByRole('link', { name: /^Status/ });
    await expect(status).toContainText('At risk');
    await expect(status.locator('svg.lucide-triangle-alert')).toBeVisible();
    await expect(page.getByRole('link', { name: /^Delivery/ })).toContainText('41 beads closed');
    await expect(page.getByRole('link', { name: /^Rework/ })).toContainText('9% rework');
    await expect(page.getByRole('link', { name: /^Bugs/ })).toContainText('3 open bugs');
    await expect(page.getByRole('link', { name: /^Quality/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^AI usage/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^Data coverage/ })).toHaveCount(0);
  });
});
