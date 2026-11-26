// TC: TC-MILESTONE-UI-126@ee25831a
import { test, expect } from '../evidence';
import { entry, forecast, forecastEpic, list, stubApi } from '../support/api';
import { timeline } from '../support/timeline';

test('TC-MILESTONE-UI-126: Epics outside a milestone are grouped', async ({ page, ev }) => {
  // Precondition: 3 closed milestones and 13 forecast epics without a milestone, listed from Task 13 down to Task 01.
  const ids = Array.from({ length: 13 }, (_, i) => 13 - i);
  const title = (n: number) => `Task ${String(n).padStart(2, '0')}`;
  await stubApi(page, {
    projects: ['gin-workflow'],
    milestones: list(
      [1, 2, 3].map((n) => entry(`c${n}`, { title: `Closed ${n}`, status: 'closed', start: `2026-0${n + 6}-01`, end: `2026-0${n + 6}-28`, finish: `2026-0${n + 6}-28` })),
      {
        today: '2026-11-26',
        forecast: forecast({
          finish: '2027-01-29', open_epics: 13,
          epics: ids.map((n, i) => forecastEpic(`e${n}`, { title: title(n), milestone: null, planned_start: `2026-12-${String(i + 1).padStart(2, '0')}`, planned_end: `2026-12-${String(i + 2).padStart(2, '0')}` })),
        }),
      },
    ),
  });

  await ev.step('1. Open /milestones?project=gin-workflow with "Show closed" off', async () => {
    await page.goto('/milestones?project=gin-workflow');
    const chart = timeline(page);
    await expect(chart.getByText('Not in a milestone', { exact: true })).toHaveCount(1);
    await expect(chart.getByRole('link')).toHaveText(ids.map(title));
    await expect(chart.getByText('Closed 1')).toHaveCount(0);
    await expect(chart.getByText('Closed 3')).toHaveCount(0);
  });
});
