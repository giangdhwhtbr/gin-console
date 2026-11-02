// TC: TC-MILESTONE-UI-054@6c4f7e2e
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-054: Label column stays visible while the chart scrolls', async ({ page, ev }) => {
  // Precondition: M1 has epic A spanning 2026-11-02 to 2026-11-27, so at 1 week there is room to step Later.
  const plan = detail(
    [epicPlan('A', { title: 'Epic A', planned_start: '2026-11-02', planned_end: '2026-11-27', estimate_days: 20 })],
    { start: '2026-11-02', end: '2026-11-27', finish: '2026-11-27', schedule_start: '2026-11-02' },
  );
  await stubApi(page, { milestone: { M1: plan } });
  const schedule = page.getByRole('figure', { name: 'Schedule' });
  const scroller = schedule.locator('[data-scroller]');
  const row = schedule.getByRole('list', { name: 'Epics' }).getByRole('listitem').filter({ has: page.getByRole('link', { name: 'A', exact: true }) });
  const label = {
    icon: row.getByRole('img', { name: 'Open' }),
    title: row.getByTitle('Epic A', { exact: true }),
    id: row.getByRole('link', { name: 'A', exact: true }),
    period: row.getByText('2 Nov – 27 Nov, 20d', { exact: true }),
  };
  const boxes = async () => Object.fromEntries(await Promise.all(Object.entries(label).map(async ([k, l]) => [k, (await l.boundingBox())!])));
  let before: Record<string, { x: number; y: number; width: number; height: number }> = {};

  await ev.step('1. Open /milestones/P/M1?zoom=1w', async () => {
    await page.goto('/milestones/P/M1?zoom=1w');
    await expect(schedule.getByRole('group', { name: 'Zoom' }).getByRole('button', { name: '1 week' })).toHaveAttribute('aria-pressed', 'true');
    await expect(schedule.locator('[data-range]')).toHaveText(/^2 Nov – /);
    for (const l of Object.values(label)) await expect(l).toBeVisible();
    before = await boxes();
  });

  await ev.step('2. Click "Later" (›)', async () => {
    await schedule.getByRole('button', { name: 'Later' }).click();
    await expect(schedule.locator('[data-range]')).toHaveText(/^9 Nov – /);
    // Let the smooth scroll settle, then check the chart really moved.
    await expect.poll(async () => {
      const a = await scroller.evaluate((el) => el.scrollLeft);
      await page.waitForFunction(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true)))));
      return a === (await scroller.evaluate((el) => el.scrollLeft)) ? a : -1;
    }).toBeGreaterThan(0);
    // A's status icon, title, id, period and estimate stay visible: same place, inside the scroller, on top of the bars.
    const view = (await scroller.boundingBox())!;
    const after = await boxes();
    for (const [k, l] of Object.entries(label)) {
      await expect(l).toBeVisible();
      expect(after[k].x, k).toBeCloseTo(before[k].x, 0);
      expect(after[k].x, k).toBeGreaterThanOrEqual(view.x);
      expect(after[k].x + after[k].width, k).toBeLessThanOrEqual(view.x + view.width);
      const onTop = await l.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + Math.min(4, r.width / 2), r.top + r.height / 2);
        return hit !== null && (el === hit || el.contains(hit));
      });
      expect(onTop, k).toBe(true);
    }
  });
});
