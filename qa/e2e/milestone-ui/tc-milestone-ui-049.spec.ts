// TC: TC-MILESTONE-UI-049@3a534a75
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-049: Earlier disabled at the start of the plan', async ({ page, ev }) => {
  // Precondition: M1's plan spans 2026-11-02 to 2026-11-27, so at 1 week the view opens on the first day with more to the right.
  const plan = detail(
    [
      epicPlan('E1', { title: 'Epic one', planned_start: '2026-11-02', planned_end: '2026-11-13', estimate_days: 10 }),
      epicPlan('E2', { title: 'Epic two', planned_start: '2026-11-16', planned_end: '2026-11-27', estimate_days: 10, depends_on: ['E1'] }),
    ],
    { start: '2026-11-02', end: '2026-11-27', finish: '2026-11-27', schedule_start: '2026-11-02' },
  );
  await stubApi(page, { milestone: { M1: plan } });
  const schedule = page.getByRole('figure', { name: 'Schedule' });

  await ev.step('1. Open /milestones/P/M1?zoom=1w', async () => {
    await page.goto('/milestones/P/M1?zoom=1w');
    await expect(schedule.getByRole('group', { name: 'Zoom' }).getByRole('button', { name: '1 week' })).toHaveAttribute('aria-pressed', 'true');
    // The first day of the plan is in view.
    await expect(schedule.locator('[data-range]')).toHaveText(/^2 Nov – /);
    await expect(schedule.getByRole('button', { name: 'Earlier' })).toBeDisabled();
    await expect(schedule.getByRole('button', { name: 'Later' })).toBeEnabled();
  });
});
