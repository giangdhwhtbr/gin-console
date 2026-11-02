// TC: TC-MILESTONE-UI-045@ca988806
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-045: Drag to later dates', async ({ page, ev }) => {
  // Precondition: M1's plan spans 2026-11-02 to 2026-11-27 and today is 2026-10-29, before the plan,
  // so `1 week` opens on the plan's first Monday with 2026-11-02 to 2026-11-08 in view.
  const plan = detail(
    [
      epicPlan('E1', { title: 'Epic one', planned_start: '2026-11-02', planned_end: '2026-11-13', estimate_days: 10 }),
      epicPlan('E2', { title: 'Epic two', planned_start: '2026-11-16', planned_end: '2026-11-27', estimate_days: 10, depends_on: ['E1'] }),
    ],
    { start: '2026-11-02', end: '2026-11-27', finish: '2026-11-27', schedule_start: '2026-11-02', today: '2026-10-29' },
  );
  await stubApi(page, { milestone: { M1: plan } });
  const schedule = page.getByRole('figure', { name: 'Schedule' });

  await ev.step('1. Open /milestones/P/M1?zoom=1w', async () => {
    await page.goto('/milestones/P/M1?zoom=1w');
    await expect(schedule.getByRole('group', { name: 'Zoom' }).getByRole('button', { name: '1 week' })).toHaveAttribute('aria-pressed', 'true');
    // The range between Earlier and Later names the first and last day in view (GanttChart.tsx).
    await expect(schedule.getByText('2 Nov – 8 Nov', { exact: true })).toBeVisible();
  });

  await ev.step('2. Drag the chart to the left by the width of one week', async () => {
    const scroller = schedule.locator('[data-scroller]');
    const mon = schedule.locator('[data-bead="2026-11-02"]');
    const nextMon = schedule.locator('[data-bead="2026-11-09"]');
    const [a, b, s] = await Promise.all([mon.boundingBox(), nextMon.boundingBox(), scroller.boundingBox()]);
    const week = b!.x - a!.x; // one week's width: Monday to the next Monday
    const y = s!.y + s!.height / 2;
    const x = s!.x + s!.width - 20;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - week, y, { steps: 10 });
    await page.mouse.up();
    await expect(schedule.getByText('9 Nov – 15 Nov', { exact: true })).toBeVisible();
    // 2026-11-09 now sits where 2026-11-02 sat before the drag, and that week's last bead (Friday 13 Nov) is in view.
    await expect.poll(async () => Math.round((await nextMon.boundingBox())!.x - a!.x)).toBe(0);
    const [fri, box] = await Promise.all([schedule.locator('[data-bead="2026-11-13"]').boundingBox(), scroller.boundingBox()]);
    expect(fri!.x + fri!.width).toBeLessThanOrEqual(box!.x + box!.width);
  });
});
