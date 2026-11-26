// TC: TC-MILESTONE-UI-121@5e8a6a80
import { test, expect } from '../evidence';
import { entry, forecast, list, stubApi } from '../support/api';
import { timeline, viewLink } from '../support/timeline';

test('TC-MILESTONE-UI-121: List view keeps the project and loads once', async ({ page, ev }) => {
  // Precondition: alpha reports m1 and a forecast; the requests for its milestone list are counted.
  const stub = await stubApi(page, {
    projects: ['alpha'],
    milestones: list([entry('m1', { title: 'Alpha launch', status: 'active', start: '2026-11-02', end: '2026-11-27' })], {
      today: '2026-11-12',
      forecast: forecast({ finish: '2026-11-27', open_epics: 1 }),
    }),
  });
  const requests = () => stub.calls.filter((u) => u.pathname === '/api/milestones' && u.searchParams.get('project') === 'alpha').length;

  await ev.step('1. Open /milestones?project=alpha&zoom=weeks&closed=1', async () => {
    await page.goto('/milestones?project=alpha&zoom=weeks&closed=1');
    await expect(timeline(page)).toBeVisible();
  });

  await ev.step('2. Press List in the View row', async () => {
    await viewLink(page, 'List').click();
    await expect(page).toHaveURL(/\/milestones\?project=alpha&zoom=weeks&closed=1&view=list$/);
    await expect(page.getByRole('list', { name: 'Milestones' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Project forecast' })).toBeVisible();
    await expect(timeline(page)).toHaveCount(0);
  });

  await ev.step('3. Press Timeline in the View row', async () => {
    await viewLink(page, 'Timeline').click();
    await expect(page).toHaveURL(/\/milestones\?project=alpha&zoom=weeks&closed=1$/);
    await expect(timeline(page)).toBeVisible();
    expect(requests()).toBe(1);
  });
});
