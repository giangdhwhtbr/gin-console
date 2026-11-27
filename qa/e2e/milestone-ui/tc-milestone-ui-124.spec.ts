// TC: TC-MILESTONE-UI-124@4a7d4081
import { test, expect } from '../evidence';
import { entry, forecast, list, stubApi } from '../support/api';

test('TC-MILESTONE-UI-124: Forecast unavailable shows the error', async ({ page, ev }) => {
  // Precondition: the forecast has the error "dependency cycle: e-1 -> e-2 -> e-1".
  await stubApi(page, {
    projects: ['gin-workflow'],
    milestones: list([entry('m1', { title: 'Alpha launch', status: 'active' })], {
      today: '2026-11-26',
      forecast: forecast({ error: 'dependency cycle: e-1 -> e-2 -> e-1' }),
    }),
  });

  await ev.step('1. Open /milestones?project=gin-workflow', async () => {
    await page.goto('/milestones?project=gin-workflow');
    const line = page.getByText('Forecast unavailable: dependency cycle: e-1 -> e-2 -> e-1', { exact: true });
    await expect(line).toBeVisible();
    await expect(line).toHaveClass(/text-destructive/);
    await expect(page.getByText('Project finishes')).toHaveCount(0);
  });
});
