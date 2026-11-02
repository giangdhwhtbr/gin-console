// TC: TC-MILESTONE-UI-041@565d7477
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

// fixme: the app drops tab=gantt from the URL on a zoom change; case or app to be fixed in gin-console-aul.
test.fixme('TC-MILESTONE-UI-041: Two weeks starts on the Monday of today', async ({ page, ev }) => {
  // Precondition: M1's plan spans 2026-11-02 to 2026-11-27 and today is 2026-11-11 (a Wednesday);
  // the preview fetched for start=2026-11-02 is the same plan.
  const plan = detail(
    [
      epicPlan('E1', { title: 'Epic one', planned_start: '2026-11-02', planned_end: '2026-11-13', estimate_days: 10 }),
      epicPlan('E2', { title: 'Epic two', planned_start: '2026-11-16', planned_end: '2026-11-27', estimate_days: 10, depends_on: ['E1'] }),
    ],
    { start: '2026-11-02', end: '2026-11-27', finish: '2026-11-27', schedule_start: '2026-11-02', today: '2026-11-11' },
  );
  await stubApi(page, { milestone: { M1: plan } });
  const schedule = page.getByRole('figure', { name: 'Schedule' });

  await ev.step('1. Open /milestones/P/M1?tab=gantt&start=2026-11-02', async () => {
    await page.goto('/milestones/P/M1?tab=gantt&start=2026-11-02');
    await expect(schedule.getByRole('group', { name: 'Zoom' })).toBeVisible();
    await expect(schedule.getByRole('button', { name: 'Whole milestone' })).toHaveAttribute('aria-pressed', 'true');
  });

  await ev.step('2. Choose "2 weeks" in Zoom', async () => {
    await schedule.getByRole('group', { name: 'Zoom' }).getByRole('button', { name: '2 weeks' }).click();
    await expect(schedule.getByRole('button', { name: '2 weeks' })).toHaveAttribute('aria-pressed', 'true');
    // The range between Earlier and Later names the first and last day in view (GanttChart.tsx).
    await expect(schedule.getByText('9 Nov – 22 Nov', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/[?&]zoom=2w(&|$)/);
    await expect(page).toHaveURL(/[?&]start=2026-11-02(&|$)/);
    await expect(page).toHaveURL(/[?&]tab=gantt(&|$)/);
  });
});
