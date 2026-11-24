// TC: TC-REPORTS-061@e25ca93d
import { test, expect } from '../evidence';
import { stubReports, teamBody } from '../support/reports';

test('TC-REPORTS-061: Open after the end date', async ({ page, ev }) => {
  // Precondition: alpha has an open milestone m2 that ended yesterday; the team report answers late_open 4.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubReports(page, { projects: ['alpha'] });
  await page.route('**/api/reports/team**', (route) => {
    const base = teamBody('alpha', { closed: 4, scope: 8, pace: 1, paceNeeded: null });
    return route.fulfill({
      json: {
        ...base,
        today: '2026-11-22',
        milestones: [{ id: 'm2', title: 'Milestone two', status: 'active', start: '2026-11-02', end: '2026-11-21', closed_on: null }],
        team: { ...base.team, in_progress: 0, open: 4, done: 0.5, on_time: 0.5, working_days: 14, elapsed: 14, days_left: 0, late_open: 4 },
      },
    });
  });

  await ev.step('1. Open `/reports/team?project=alpha&milestone=m2`', async () => {
    await page.goto('/reports/team?project=alpha&milestone=m2');
    await expect(page.getByRole('group', { name: 'Key figures' })).toBeVisible();
  });

  await ev.step('2. Look at the On time figure', async () => {
    const line = page.getByText('4 open after the end date');
    await expect(line).toBeVisible();
    await expect(line.locator('xpath=ancestor-or-self::span[contains(@class,"text-xs")]')).toHaveClass(/text-state-blocked/);
  });
});
