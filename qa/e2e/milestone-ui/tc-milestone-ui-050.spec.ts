// TC: TC-MILESTONE-UI-050@c13918ea
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-050: Later disabled at the end of the plan', async ({ page, ev }) => {
  // Precondition: M1's plan spans 2026-11-02 to 2026-11-13, so at 1 week the view opens on the first week with more to the right.
  const plan = detail(
    [
      epicPlan('E1', { title: 'Epic one', planned_start: '2026-11-02', planned_end: '2026-11-06', estimate_days: 5 }),
      epicPlan('E2', { title: 'Epic two', planned_start: '2026-11-09', planned_end: '2026-11-13', estimate_days: 5, depends_on: ['E1'] }),
    ],
    { start: '2026-11-02', end: '2026-11-13', finish: '2026-11-13', schedule_start: '2026-11-02' },
  );
  await stubApi(page, { milestone: { M1: plan } });
  const schedule = page.getByRole('figure', { name: 'Schedule' });

  await ev.step('1. Open /milestones/P/M1?zoom=1w', async () => {
    await page.goto('/milestones/P/M1?zoom=1w');
    await expect(schedule.getByRole('group', { name: 'Zoom' }).getByRole('button', { name: '1 week' })).toHaveAttribute('aria-pressed', 'true');
    await expect(schedule.locator('[data-range]')).toHaveText(/^2 Nov – /);
    await expect(schedule.getByRole('button', { name: 'Later' })).toBeEnabled();
  });

  await ev.step('2. Click "Later" (›)', async () => {
    await schedule.getByRole('button', { name: 'Later' }).click();
    // The axis is widened to whole weeks at 1 week (gantt.ts axisOf), so the last week, Mon 9 Nov to Sun 15 Nov, is in view ...
    await expect(schedule.locator('[data-range]')).toHaveText('9 Nov – 15 Nov');
    // ... and the plan's last day, Fri 13 Nov, lies inside the chart once the smooth scroll settles.
    const scroller = schedule.locator('[data-scroller]');
    await expect.poll(async () => {
      const [last, box] = await Promise.all([schedule.locator('[data-bead="2026-11-13"]').boundingBox(), scroller.boundingBox()]);
      return last!.x + last!.width <= box!.x + box!.width + 0.5 && last!.x >= box!.x;
    }).toBe(true);
    await expect(schedule.getByRole('button', { name: 'Later' })).toBeDisabled();
  });
});
