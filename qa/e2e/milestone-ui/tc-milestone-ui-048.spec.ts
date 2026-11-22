// TC: TC-MILESTONE-UI-048@b9766851
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-048: Step by a period', async ({ page, ev }) => {
  // Precondition: M1's plan spans 2026-11-02 to 2026-12-11 and today is 2026-10-29, before the plan,
  // so `2 weeks` opens on the plan's first Monday with 2026-11-02 to 2026-11-15 in view.
  const plan = detail(
    [
      epicPlan('E1', { title: 'Epic one', planned_start: '2026-11-02', planned_end: '2026-11-20', estimate_days: 15 }),
      epicPlan('E2', { title: 'Epic two', planned_start: '2026-11-23', planned_end: '2026-12-11', estimate_days: 15, depends_on: ['E1'] }),
    ],
    { start: '2026-11-02', end: '2026-12-11', finish: '2026-12-11', schedule_start: '2026-11-02', today: '2026-10-29' },
  );
  await stubApi(page, { milestone: { M1: plan } });
  const schedule = page.getByRole('figure', { name: 'Schedule' });
  const scroller = schedule.locator('[data-scroller]');
  // The day labels of the header are aria-hidden: a working day's label starts where its column does.
  const dayLabel = (day: number) => schedule.locator('[data-scroller] span.tabular-nums').filter({ hasText: new RegExp(`^(\\w{3} )?${day}$`) }).first();
  let firstX = 0; // where the first day in view starts on screen

  await ev.step('1. Open /milestones/P/M1?zoom=2w', async () => {
    await page.goto('/milestones/P/M1?zoom=2w');
    await expect(schedule.getByRole('group', { name: 'Zoom' }).getByRole('button', { name: '2 weeks' })).toHaveAttribute('aria-pressed', 'true');
    // The range between Earlier and Later names the first and last day in view (GanttChart.tsx).
    await expect(schedule.getByText('2 Nov – 15 Nov', { exact: true })).toBeVisible();
    firstX = (await dayLabel(2).boundingBox())!.x;
  });

  await ev.step('2. Click "Later" (›)', async () => {
    await schedule.getByRole('button', { name: 'Later' }).click();
    await expect(schedule.getByText('16 Nov – 29 Nov', { exact: true })).toBeVisible();
    // 2026-11-16 now starts where 2026-11-02 started (the smooth scroll settles first) ...
    await expect.poll(async () => Math.round((await dayLabel(16).boundingBox())!.x - firstX)).toBe(0);
    // ... and the period ends on Sunday 29 Nov: epic E2 (Mon 23 Nov to Fri 11 Dec) starts inside the chart and runs past its right edge.
    const [e2, box] = await Promise.all([schedule.locator('[data-bar="E2"]').boundingBox(), scroller.boundingBox()]);
    expect(e2!.x).toBeLessThan(box!.x + box!.width);
    expect(e2!.x + e2!.width).toBeGreaterThan(box!.x + box!.width);
  });
});
