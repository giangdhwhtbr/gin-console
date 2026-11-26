// TC: TC-MILESTONE-UI-120@7e1d0507
import { test, expect } from '../evidence';
import { entry, forecast, forecastEpic, forecastMilestone, list, stubApi } from '../support/api';
import { timeline, viewLink } from '../support/timeline';

test('TC-MILESTONE-UI-120: Timeline is the default view', async ({ page, ev }) => {
  // Precondition: alpha reports m1 "Alpha launch" (active) and a forecast with one epic of m1.
  await stubApi(page, {
    projects: ['alpha'],
    milestones: list([entry('m1', { title: 'Alpha launch', status: 'active', start: '2026-11-02', end: '2026-11-27' })], {
      today: '2026-11-12',
      forecast: forecast({
        finish: '2026-11-10', open_epics: 1,
        milestones: [forecastMilestone('m1', { start: '2026-11-03', finish: '2026-11-10' })],
        epics: [forecastEpic('e1', { milestone: 'm1', title: 'Login', planned_start: '2026-11-03', planned_end: '2026-11-10' })],
      }),
    }),
  });

  await ev.step('1. Open /milestones?project=alpha', async () => {
    await page.goto('/milestones?project=alpha');
    await expect(timeline(page)).toBeVisible();
    await expect(viewLink(page, 'Timeline')).toHaveAttribute('aria-current', 'page');
    await expect(viewLink(page, 'List')).not.toHaveAttribute('aria-current', 'page');
    expect(new URL(page.url()).searchParams.has('view')).toBe(false);
  });

  await ev.step('2. Open /milestones?project=alpha&view=other', async () => {
    await page.goto('/milestones?project=alpha&view=other');
    await expect(timeline(page)).toBeVisible();
    await expect(viewLink(page, 'Timeline')).toHaveAttribute('aria-current', 'page');
    expect(new URL(page.url()).searchParams.get('view')).toBe('other');
  });
});
