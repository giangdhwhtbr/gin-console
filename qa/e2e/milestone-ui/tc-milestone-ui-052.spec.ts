// TC: TC-MILESTONE-UI-052@8e78effa
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-052: Days in view kept when the plan refreshes', async ({ page, ev }) => {
  // Precondition: M1's plan spans 2026-11-02 to 2026-11-27, so at 1 week there is room to step Later.
  const plan = detail(
    [
      epicPlan('E1', { title: 'Epic one', planned_start: '2026-11-02', planned_end: '2026-11-13', estimate_days: 10 }),
      epicPlan('E2', { title: 'Epic two', planned_start: '2026-11-16', planned_end: '2026-11-27', estimate_days: 10, depends_on: ['E1'] }),
    ],
    { start: '2026-11-02', end: '2026-11-27', finish: '2026-11-27', schedule_start: '2026-11-02' },
  );
  // The 10 s refresh answers a changed plan (a third epic, a later end), so the chart redraws with new data.
  const refreshed = detail(
    [...plan.epics, epicPlan('E3', { title: 'Epic three', planned_start: '2026-11-30', planned_end: '2026-12-04', estimate_days: 5, depends_on: ['E2'] })],
    { start: '2026-11-02', end: '2026-12-04', finish: '2026-12-04', schedule_start: '2026-11-02' },
  );
  let answers = 0;
  await stubApi(page, { milestone: () => (answers++ === 0 ? plan : refreshed) });
  const schedule = page.getByRole('figure', { name: 'Schedule' });
  const range = schedule.locator('[data-range]');

  await ev.step('1. Open /milestones/P/M1?zoom=1w', async () => {
    await page.goto('/milestones/P/M1?zoom=1w');
    await expect(schedule.getByRole('group', { name: 'Zoom' }).getByRole('button', { name: '1 week' })).toHaveAttribute('aria-pressed', 'true');
    await expect(range).toHaveText(/^2 Nov – /);
  });

  let before = '';
  let scrolled = 0;
  await ev.step('2. Click "Later" (›)', async () => {
    await schedule.getByRole('button', { name: 'Later' }).click();
    await expect(range).toHaveText(/^9 Nov – /);
    // Let the smooth scroll settle before recording what is in view.
    const scroller = schedule.locator('[data-scroller]');
    await expect.poll(async () => {
      const a = await scroller.evaluate((el) => el.scrollLeft);
      await page.waitForFunction(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true)))));
      return a === (await scroller.evaluate((el) => el.scrollLeft)) ? a : -1;
    }).toBeGreaterThan(0);
    before = (await range.textContent()) ?? '';
    scrolled = await scroller.evaluate((el) => el.scrollLeft);
  });

  await ev.step('3. Wait for the plan to refresh', async () => {
    // useLoad.ts refreshes every 10 s; the refreshed plan adds Epic three.
    await expect(schedule.getByRole('list', { name: 'Epics' })).toContainText('Epic three', { timeout: 15_000 });
    expect(answers).toBeGreaterThanOrEqual(2);
    await expect(range).toHaveText(before);
    expect(await schedule.locator('[data-scroller]').evaluate((el) => el.scrollLeft)).toBe(scrolled);
  });
});
