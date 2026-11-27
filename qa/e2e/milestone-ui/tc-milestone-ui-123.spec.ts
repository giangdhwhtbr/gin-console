// TC: TC-MILESTONE-UI-123@5a336100
import { test, expect } from '../evidence';
import { entry, forecast, list, stubApi } from '../support/api';

test('TC-MILESTONE-UI-123: Project finish without a deadline', async ({ page, ev }) => {
  // Precondition: the forecast finishes 19 Jan 2027, has no deadline and no overflow; today is 5 Jan 2027.
  await stubApi(page, {
    projects: ['gin-workflow'],
    milestones: list([entry('m1', { title: 'Alpha launch', status: 'active' })], {
      today: '2027-01-05',
      forecast: forecast({ finish: '2027-01-19', deadline: null, overflow_days: 0, open_epics: 3 }),
    }),
  });

  await ev.step('1. Open /milestones?project=gin-workflow', async () => {
    await page.goto('/milestones?project=gin-workflow');
    const line = page.locator('p', { hasText: 'Project finishes' });
    await expect(line).toHaveText('Project finishes 19 Jan');
    await expect(page.getByText('deadline', { exact: false })).toHaveCount(0);
    await expect(page.getByText('working days late')).toHaveCount(0);
  });
});
