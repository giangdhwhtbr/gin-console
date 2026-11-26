// TC: TC-MILESTONE-UI-136@c04a088d
import { test, expect } from '../evidence';
import { forecast, forecastEpic, list, stubApi } from '../support/api';

test('TC-MILESTONE-UI-136: Assumed estimate has a dashed bar', async ({ page, ev }) => {
  // Precondition: ex-e12 has the estimate source "assumed" and ex-e14 has "points"; today is 26 Nov 2026.
  await stubApi(page, {
    projects: ['example'],
    milestones: list([], {
      today: '2026-11-26',
      forecast: forecast({
        finish: '2026-12-18', open_epics: 2,
        epics: [
          forecastEpic('ex-e12', { title: 'Regional tax rules', estimate_source: 'assumed', planned_start: '2026-11-30', planned_end: '2026-12-11', remaining_days: null }),
          forecastEpic('ex-e14', { title: 'Invoice archive', estimate_source: 'points', planned_start: '2026-12-07', planned_end: '2026-12-18', remaining_days: 5 }),
        ],
      }),
    }),
  });

  await ev.step('1. Open /milestones?project=example', async () => {
    await page.goto('/milestones?project=example');
    const assumed = page.getByLabel(/Regional tax rules: .*assumed estimate/);
    await expect(assumed).toHaveCount(1);
    await expect(assumed).toHaveAttribute('data-assumed', '');
    await expect(assumed).toHaveClass(/border-dashed/);
    const points = page.getByLabel(/Invoice archive: /);
    await expect(points).toHaveCount(1);
    await expect(points).not.toHaveAttribute('data-assumed', '');
    await expect(points).not.toHaveClass(/border-dashed/);
    await expect(points).not.toHaveAttribute('aria-label', /assumed estimate/);
  });
});
