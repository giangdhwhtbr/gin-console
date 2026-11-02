// TC: TC-MILESTONE-UI-008@379f9b54
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-008: Today line drawn at the JSON today', async ({ page, ev }) => {
  // Preconditions: `show` reports today 2026-11-04 while the browser clock says 2026-11-20.
  await page.clock.setFixedTime(new Date('2026-11-20T12:00:00'));
  await stubApi(page, { milestone: { M1: detail([epicPlan('A', { title: 'Epic A' })], { today: '2026-11-04' }) } });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.getByRole('tab', { name: 'Gantt' })).toHaveAttribute('aria-selected', 'true');
    // The today line and the day header are aria-hidden drawings: compare their geometry.
    const line = await page.locator('[data-line="today"]').boundingBox();
    const day = await page.getByText(/^(Wed )?4$/).boundingBox();
    expect(line).not.toBeNull();
    expect(day).not.toBeNull();
    expect(line!.x).toBeGreaterThan(day!.x);
    expect(line!.x).toBeLessThan(day!.x + day!.width);
  });
});
