// TC: TC-MILESTONE-UI-046@ab4bb3e1
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-046: Drag over a link does not open it', async ({ page, ev }) => {
  // Precondition: M1's plan spans 2026-11-02 to 2026-11-27, so at 1 week the chart scrolls sideways.
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
    await expect(schedule.getByRole('link', { name: 'E1', exact: true })).toBeVisible();
  });

  await ev.step('2. Press on an epic id, drag 40 px and release', async () => {
    const scroller = schedule.locator('[data-scroller]');
    const before = await scroller.evaluate((el) => el.scrollLeft);
    const box = (await schedule.getByRole('link', { name: 'E1', exact: true }).boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 40, y, { steps: 8 });
    await page.mouse.up();
    // The days in view move: the scroller pans by the drag, and Earlier is no longer disabled.
    await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBeCloseTo(before + 40, 0);
    await expect(schedule.getByRole('button', { name: 'Earlier' })).toBeEnabled();
    // The bead page is not opened.
    await expect(page).toHaveURL(/\/milestones\/P\/M1\?zoom=1w$/);
    await expect(page.getByRole('heading', { name: 'Beta readiness' })).toBeVisible();
  });
});
