// TC: TC-MILESTONE-UI-130@8c0ebf9a
import { test, expect } from '../evidence';
import { entry, forecast, forecastMilestone, list, stubApi } from '../support/api';
import { axisHeader, boxOf, timeline } from '../support/timeline';

test('TC-MILESTONE-UI-130: Today and deadline lines', async ({ page, ev }) => {
  // Precondition: ex-m1 runs 5 Oct 2026 to 8 Jan 2027, the deadline is 11 Dec and the forecast finishes 30 Jun 2027; today is 26 Nov 2026.
  await stubApi(page, {
    projects: ['example'],
    milestones: list([entry('ex-m1', { title: 'Foundations', status: 'active', start: '2026-10-05', end: '2027-01-08', finish: '2027-06-30' })], {
      today: '2026-11-26',
      forecast: forecast({ deadline: '2026-12-11', finish: '2027-06-30', open_epics: 1, milestones: [forecastMilestone('ex-m1', { start: '2026-11-26', finish: '2027-06-30' })] }),
    }),
  });

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  await ev.step('2. Open /milestones?project=example', async () => {
    await page.goto('/milestones?project=example');
    await expect(axisHeader(page).locator('[data-chip="today"]')).toHaveText('Today');
    await expect(axisHeader(page).locator('[data-chip="deadline"]')).toHaveText('Deadline');
    const today = await boxOf(page.locator('[data-line="today"]'));
    const deadline = await boxOf(page.locator('[data-line="deadline"]'));
    expect(deadline.x - today.x).toBeCloseTo(15 * 6, 0);
    const label = await boxOf(axisHeader(page).locator('> div').first());
    expect(today.x - (label.x + label.width)).toBeCloseTo(40, 0);
    await expect(timeline(page)).toBeVisible();
  });
});
