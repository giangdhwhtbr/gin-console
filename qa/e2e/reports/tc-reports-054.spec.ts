// TC: TC-REPORTS-054@4229c008
import { test, expect } from '../evidence';
import { entry, list, type MilestoneEntry } from '../support/api';
import { stubReports } from '../support/reports';

test('TC-REPORTS-054: Nothing kicked off yet (REQ-REPORTS-018)', async ({ page, ev }) => {
  // Precondition: alpha's milestones all have committed_points null and completed_points 0, or no velocity key.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const none = { committed_points: null, completed_points: 0, added_points: 0, say_do: null, days_per_point: null, planned_days_per_point: null, accuracy: null };
  const m1 = { ...entry('m1'), velocity: none } as MilestoneEntry;
  await stubReports(page, { projects: ['alpha'], milestones: list([m1, entry('m2')]) });

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open `/reports/velocity?project=alpha`', async () => {
    await page.goto('/reports/velocity?project=alpha');
    const panel = page.getByRole('region', { name: 'Velocity' });
    await expect(panel.getByText('No kicked-off milestones with points yet')).toBeVisible();
    await expect(panel.getByRole('img')).toHaveCount(0);
    await expect(panel.getByRole('table')).toHaveCount(0);
  });
});
