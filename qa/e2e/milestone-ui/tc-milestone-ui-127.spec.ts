// TC: TC-MILESTONE-UI-127@aeee1827
import { test, expect } from '../evidence';
import { entry, forecast, forecastEpic, forecastMilestone, list, stubApi } from '../support/api';
import { boxOf, timeline } from '../support/timeline';

test('TC-MILESTONE-UI-127: Order of groups on the Timeline', async ({ page, ev }) => {
  // Precondition: closed m0; chained m2 then m3 (m3 starts first); open m4 outside the chain; one epic without a milestone.
  await stubApi(page, {
    projects: ['example'],
    milestones: list(
      [
        entry('m4', { title: 'Fourth', status: 'planned', start: '2027-01-04', end: '2027-01-29', finish: null }),
        entry('m3', { title: 'Third', status: 'planned', start: '2026-12-01', end: '2026-12-18', finish: '2027-01-15' }),
        entry('m2', { title: 'Second', status: 'active', start: '2026-12-21', end: '2027-01-08', finish: '2026-12-30' }),
        entry('m0', { title: 'Discovery', status: 'closed', start: '2026-09-01', end: '2026-09-30', finish: '2026-09-30' }),
      ],
      {
        today: '2026-11-26',
        forecast: forecast({
          finish: '2027-01-15', open_epics: 1,
          milestones: [forecastMilestone('m2', { start: '2026-12-21', finish: '2026-12-30' }), forecastMilestone('m3', { start: '2026-12-31', finish: '2027-01-15' })],
          epics: [forecastEpic('e9', { title: 'Loose epic', milestone: null })],
        }),
      },
    ),
  });

  await ev.step('1. Open /milestones?project=example&closed=1', async () => {
    await page.goto('/milestones?project=example&closed=1');
    const chart = timeline(page);
    await expect(chart.getByRole('link')).toHaveText(['Discovery', 'Second', 'Third', 'Fourth', 'Loose epic']);
    const heading = await boxOf(chart.getByText('Not in a milestone', { exact: true }));
    const fourth = await boxOf(chart.getByRole('link', { name: 'Fourth' }));
    const loose = await boxOf(chart.getByRole('link', { name: 'Loose epic' }));
    expect(heading.y).toBeGreaterThan(fourth.y);
    expect(loose.y).toBeGreaterThan(heading.y);
  });
});
