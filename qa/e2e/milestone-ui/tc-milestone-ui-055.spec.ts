// TC: TC-MILESTONE-UI-055@c4550588
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-055: Title shown after the bar when room is left', async ({ page, ev }) => {
  // Precondition: epic A's bar ends on the first day of the 10-day plan, shown as Whole milestone.
  const plan = detail(
    [epicPlan('A', { title: 'Epic A title', planned_start: '2026-11-02', planned_end: '2026-11-02', estimate_days: 1 })],
    { start: '2026-11-02', end: '2026-11-13', finish: '2026-11-13', schedule_start: '2026-11-02' },
  );
  await stubApi(page, { milestone: { M1: plan } });
  const schedule = page.getByRole('figure', { name: 'Schedule' });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1?zoom=all');
    await expect(schedule.getByRole('group', { name: 'Zoom' }).getByRole('button', { name: 'Whole milestone' })).toHaveAttribute('aria-pressed', 'true');
    await expect(schedule.getByRole('link', { name: 'A', exact: true })).toBeVisible();
    await expect(schedule.locator('[data-tail]')).toHaveText('Epic A title');
  });
});
