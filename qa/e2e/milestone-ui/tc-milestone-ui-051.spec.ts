// TC: TC-MILESTONE-UI-051@5373c3fc
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-051: Whole milestone does not pan', async ({ page, ev }) => {
  // Precondition: M1's plan spans 2026-11-02 to 2026-11-13, which fits the default 1280 px wide window at "Whole milestone".
  const plan = detail(
    [
      epicPlan('E1', { title: 'Epic one', planned_start: '2026-11-02', planned_end: '2026-11-06', estimate_days: 5 }),
      epicPlan('E2', { title: 'Epic two', planned_start: '2026-11-09', planned_end: '2026-11-13', estimate_days: 5, depends_on: ['E1'] }),
    ],
    { start: '2026-11-02', end: '2026-11-13', finish: '2026-11-13', schedule_start: '2026-11-02' },
  );
  await stubApi(page, { milestone: { M1: plan } });
  const schedule = page.getByRole('figure', { name: 'Schedule' });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(schedule.getByRole('group', { name: 'Zoom' }).getByRole('button', { name: 'Whole milestone' })).toHaveAttribute('aria-pressed', 'true');
    await expect(schedule.getByRole('link', { name: 'E1', exact: true })).toBeVisible();
  });

  await ev.step('2. Drag the chart to the left by 100 px', async () => {
    const scroller = schedule.locator('[data-scroller]');
    const bead = schedule.locator('[data-bead="2026-11-09"]').first();
    const beadBefore = (await bead.boundingBox())!;
    const box = (await scroller.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 100, y, { steps: 10 });
    await page.mouse.up();
    // ‹, › and the label of days in view are not shown.
    await expect(schedule.getByRole('button', { name: 'Earlier' })).toHaveCount(0);
    await expect(schedule.getByRole('button', { name: 'Later' })).toHaveCount(0);
    await expect(schedule.locator('[data-range]')).toHaveCount(0);
    // The chart does not move: nothing to scroll, the scroller stays at 0 and a bead keeps its place.
    expect(await scroller.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await scroller.evaluate((el) => el.scrollLeft)).toBe(0);
    const beadAfter = (await bead.boundingBox())!;
    expect(beadAfter.x).toBeCloseTo(beadBefore.x, 0);
    await expect(page).toHaveURL(/\/milestones\/P\/M1$/);
  });
});
