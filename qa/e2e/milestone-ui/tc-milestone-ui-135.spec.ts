// TC: TC-MILESTONE-UI-135@f30a806a
import { test, expect } from '../evidence';
import { entry, forecast, forecastMilestone, list, stubApi } from '../support/api';
import { timeline } from '../support/timeline';

test('TC-MILESTONE-UI-135: Milestone without open epics', async ({ page, ev }) => {
  // Precondition: chained ex-m4 "Hardening" (14 Dec 2026 to 8 Jan 2027) whose forecast entry has no start and no finish; today is 26 Nov 2026.
  await stubApi(page, {
    projects: ['example'],
    milestones: list([entry('ex-m4', { title: 'Hardening', status: 'planned', start: '2026-12-14', end: '2027-01-08', finish: null })], {
      today: '2026-11-26',
      forecast: forecast({ milestones: [forecastMilestone('ex-m4', { start: null, finish: null })] }),
    }),
  });

  await ev.step('1. Open /milestones?project=example', async () => {
    await page.goto('/milestones?project=example');
    const chart = timeline(page);
    await expect(chart.getByRole('link', { name: 'Hardening' })).toBeVisible();
    await expect(chart.locator('[data-bar="milestone"]')).toHaveCount(1);
    await expect(chart.getByText('No open epics', { exact: true })).toBeVisible();
    await expect(chart.locator('[data-overrun]')).toHaveCount(0);
  });
});
