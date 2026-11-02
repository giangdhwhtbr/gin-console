// TC: TC-MILESTONE-UI-058@ec737030
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-058: No arrow for a dependency outside the milestone', async ({ page, ev }) => {
  // Precondition: epic B in M1 depends on X, which is not an epic of M1.
  const plan = detail([
    epicPlan('A', { title: 'Epic A title', planned_start: '2026-11-02', planned_end: '2026-11-02', estimate_days: 1 }),
    epicPlan('B', { title: 'Epic B title', planned_start: '2026-11-03', planned_end: '2026-11-04', estimate_days: 2, depends_on: ['X'] }),
  ]);
  await stubApi(page, { milestone: { M1: plan } });
  const schedule = page.getByRole('figure', { name: 'Schedule' });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(schedule.getByRole('link', { name: 'A', exact: true })).toBeVisible();
    await expect(schedule.getByRole('link', { name: 'B', exact: true })).toBeVisible();
    await expect(schedule.locator('path[data-from="X"], path[data-to="X"]')).toHaveCount(0);
    await expect(schedule.locator('path[data-from][data-to]')).toHaveCount(0);
  });
});
