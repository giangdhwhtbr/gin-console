// TC: TC-MILESTONE-UI-040@453cd788
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-040: Whole milestone by default fills the width', async ({ page, ev }) => {
  // Precondition: M1's plan spans 2026-11-02 to 2026-11-11 (start, schedule, epics and end); epic B ends on the last day.
  await stubApi(page, {
    milestone: {
      M1: detail(
        [
          epicPlan('A', { title: 'Epic A', planned_start: '2026-11-02', planned_end: '2026-11-04' }),
          epicPlan('B', { title: 'Epic B', planned_start: '2026-11-09', planned_end: '2026-11-11', depends_on: ['A'] }),
        ],
        { id: 'M1', title: 'Alpha launch', start: '2026-11-02', end: '2026-11-11', schedule_start: '2026-11-02', finish: '2026-11-11' },
      ),
    },
  });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.getByRole('heading', { name: 'Alpha launch' })).toBeVisible();
    const chart = page.getByRole('figure', { name: 'Schedule' });
    const zoom = chart.getByRole('group', { name: 'Zoom' });
    await expect(zoom.getByRole('button', { name: 'Whole milestone' })).toHaveAttribute('aria-pressed', 'true');
    await expect(zoom.getByRole('button', { name: '1 week' })).toHaveAttribute('aria-pressed', 'false');
    await expect(zoom.getByRole('button', { name: '2 weeks' })).toHaveAttribute('aria-pressed', 'false');
    // Right edge: the chart does not scroll, and the bead of the plan's last day ends at the scroller's
    // right edge (beads sit 2px inside their day column, GanttChart.tsx).
    const scroller = chart.locator('[data-scroller]');
    const lastBead = chart.locator('[data-bead="2026-11-11"]');
    await expect(lastBead).toBeVisible();
    await expect
      .poll(() => scroller.evaluate((el) => el.scrollWidth - el.clientWidth))
      .toBeLessThanOrEqual(1);
    await expect
      .poll(async () => {
        const [s, b] = await Promise.all([scroller.boundingBox(), lastBead.boundingBox()]);
        return s && b ? Math.round(s.x + s.width - (b.x + b.width)) : null;
      })
      .toBeLessThanOrEqual(4);
    const [s, b] = await Promise.all([scroller.boundingBox(), lastBead.boundingBox()]);
    expect(s!.x + s!.width - (b!.x + b!.width)).toBeGreaterThanOrEqual(0);
  });
});
