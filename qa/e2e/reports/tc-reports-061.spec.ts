// TC: TC-REPORTS-061@7385c618
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';

const figures = {
  scope: 8, closed: 4, in_progress: 0, open: 4, blocked: 0, unclaimed: 0, done: 0.5, throughput: 1,
  cycle_median: 1.5, oldest_in_progress: null, on_time: 0.5, rework_rate: 0, reopens: 0, bugs: 0,
};

test('TC-REPORTS-061: Open after the end date', async ({ page, ev }) => {
  // Precondition: alpha has an open milestone m2 that ended yesterday; the team report answers late_open 4.
  await stubApi(page, { projects: ['alpha'] });
  await page.route('**/api/reports/team**', (route) =>
    route.fulfill({
      json: {
        generated_at: '2026-11-22T10:00:00Z', project: 'alpha', today: '2026-11-22',
        milestones: [{ id: 'm2', title: 'Milestone two', status: 'active', start: '2026-11-02', end: '2026-11-21', closed_on: null }],
        undated: 0, milestone: 'm2',
        team: { ...figures, working_days: 14, elapsed: 14, days_left: 0, pace: 1, pace_needed: null, late_open: 4 },
        members: [], days: [], beads: [],
      },
    }),
  );

  await ev.step('1. Open `/reports?project=alpha&tab=team&milestone=m2`', async () => {
    await page.goto('/reports?project=alpha&tab=team&milestone=m2');
    await expect(page.getByRole('group', { name: 'Key figures' })).toBeVisible();
  });

  await ev.step('2. Look at the On time figure', async () => {
    const line = page.getByText('4 open after the end date');
    await expect(line).toBeVisible();
    await expect(line.locator('xpath=ancestor-or-self::span[contains(@class,"text-xs")]')).toHaveClass(/text-state-blocked/);
  });
});
