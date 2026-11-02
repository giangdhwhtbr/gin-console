// TC: TC-MILESTONE-UI-057@166c6365
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-057: Arrow from the end of the dependency to the start of the dependent', async ({ page, ev }) => {
  // Precondition: epic B depends on A; A planned 2026-11-02, B planned 2026-11-03.
  const plan = detail([
    epicPlan('A', { title: 'Epic A title', planned_start: '2026-11-02', planned_end: '2026-11-02', estimate_days: 1 }),
    epicPlan('B', { title: 'Epic B title', planned_start: '2026-11-03', planned_end: '2026-11-04', estimate_days: 2, depends_on: ['A'] }),
  ]);
  await stubApi(page, { milestone: { M1: plan } });
  const schedule = page.getByRole('figure', { name: 'Schedule' });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    const a = schedule.getByRole('link', { name: 'A', exact: true });
    const b = schedule.getByRole('link', { name: 'B', exact: true });
    await expect(a).toBeVisible();
    await expect(b).toBeVisible();
    const arrow = schedule.locator('path[data-from="A"][data-to="B"]');
    await expect(arrow).toHaveCount(1);
    // not in the blocked color: not flagged late and not toned as blocked
    await expect(arrow).not.toHaveAttribute('data-late', /.*/);
    await expect(arrow).not.toHaveClass(/state-blocked/);
    // bars: A's last day cell and B's first day cell (2026-11-02 and 2026-11-03)
    const aDay = schedule.locator('li[data-epic="A"] [data-bead="2026-11-02"]');
    const bDay = schedule.locator('li[data-epic="B"] [data-bead="2026-11-03"]');
    const [ab, bb, pb] = [await aDay.boundingBox(), await bDay.boundingBox(), await arrow.boundingBox()];
    // arrow leaves at A's right edge and enters at B's left edge (cells have 2px inset)
    // the path may detour left of B's start (when the gap is under 16px) but never starts right of A's end
    expect(pb!.x).toBeLessThanOrEqual(ab!.x + ab!.width);
    expect(pb!.x + pb!.width).toBeGreaterThan(ab!.x + ab!.width);
    expect(pb!.y).toBeLessThanOrEqual(ab!.y + ab!.height);
    expect(pb!.y + pb!.height).toBeGreaterThanOrEqual(bb!.y);
    expect(Math.abs(pb!.x + pb!.width - bb!.x)).toBeLessThanOrEqual(8);
  });
});
