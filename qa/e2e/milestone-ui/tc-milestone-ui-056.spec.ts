// TC: TC-MILESTONE-UI-056@09493f80
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-056: No title after a bar that ends near the chart edge', async ({ page, ev }) => {
  // Precondition: epic Z's bar ends on the last day of the plan, shown as Whole milestone.
  const plan = detail(
    [epicPlan('Z', { title: 'Epic Z title', planned_start: '2026-11-12', planned_end: '2026-11-13', estimate_days: 2 })],
    { start: '2026-11-02', end: '2026-11-13', finish: '2026-11-13', schedule_start: '2026-11-02' },
  );
  await stubApi(page, { milestone: { M1: plan } });
  const schedule = page.getByRole('figure', { name: 'Schedule' });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1?zoom=all');
    await expect(schedule.getByRole('group', { name: 'Zoom' }).getByRole('button', { name: 'Whole milestone' })).toHaveAttribute('aria-pressed', 'true');
    await expect(schedule.getByRole('link', { name: 'Z', exact: true })).toBeVisible();
    await expect(schedule.locator('[data-tail]')).toHaveCount(0);
  });
});
