// TC: TC-MILESTONE-UI-042@33c8758e
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test("TC-MILESTONE-UI-042: Today outside the plan starts on the plan's first Monday", async ({ page, ev }) => {
  // Precondition: M1's plan starts on Wednesday 2026-11-04 and today is 2026-10-29, before the plan.
  const plan = detail(
    [
      epicPlan('E1', { title: 'Epic one', planned_start: '2026-11-04', planned_end: '2026-11-13', estimate_days: 8 }),
      epicPlan('E2', { title: 'Epic two', planned_start: '2026-11-16', planned_end: '2026-11-27', estimate_days: 10, depends_on: ['E1'] }),
    ],
    { start: '2026-11-04', end: '2026-11-27', finish: '2026-11-27', schedule_start: '2026-11-04', today: '2026-10-29' },
  );
  await stubApi(page, { milestone: { M1: plan } });
  const schedule = page.getByRole('figure', { name: 'Schedule' });

  await ev.step('1. Open /milestones/P/M1?zoom=1w', async () => {
    await page.goto('/milestones/P/M1?zoom=1w');
    const zoom = schedule.getByRole('group', { name: 'Zoom' });
    await expect(zoom.getByRole('button', { name: '1 week' })).toHaveAttribute('aria-pressed', 'true');
    await expect(zoom.getByRole('button', { name: 'Whole milestone' })).toHaveAttribute('aria-pressed', 'false');
    // The range between Earlier and Later names the first and last day in view (GanttChart.tsx).
    await expect(schedule.getByText('2 Nov – 8 Nov', { exact: true })).toBeVisible();
  });
});
