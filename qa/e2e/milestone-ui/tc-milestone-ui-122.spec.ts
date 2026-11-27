// TC: TC-MILESTONE-UI-122@30cd9230
import { test, expect } from '../evidence';
import { entry, forecast, list, stubApi } from '../support/api';

test('TC-MILESTONE-UI-122: Project finish late against the deadline', async ({ page, ev }) => {
  // Precondition: the forecast finishes 22 Dec, the deadline is 11 Dec, 7 working days late; today is 26 Nov 2026.
  await stubApi(page, {
    projects: ['gin-workflow'],
    milestones: list([entry('m1', { title: 'Alpha launch', status: 'active' })], {
      today: '2026-11-26',
      forecast: forecast({ finish: '2026-12-22', deadline: '2026-12-11', overflow_days: 7, open_epics: 3 }),
    }),
  });
  const finishLine = () => page.locator('p', { hasText: 'Project finishes' });

  await ev.step('1. Open /milestones?project=gin-workflow', async () => {
    await page.goto('/milestones?project=gin-workflow');
    await expect(finishLine()).toContainText('Project finishes 22 Dec');
    await expect(finishLine()).toContainText('deadline 11 Dec');
    const late = finishLine().getByText('7 working days late');
    await expect(late).toBeVisible();
    await expect(late).toHaveClass(/text-state-blocked/);
    await expect(late.locator('svg[data-glyph="deferred"]')).toHaveCount(1);
  });

  await ev.step('2. Open /milestones?project=gin-workflow&view=list', async () => {
    await page.goto('/milestones?project=gin-workflow&view=list');
    await expect(page.getByRole('list', { name: 'Milestones' })).toBeVisible();
    await expect(finishLine()).toContainText('Project finishes 22 Dec');
    await expect(finishLine()).toContainText('7 working days late');
  });
});
