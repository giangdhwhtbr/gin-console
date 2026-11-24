// TC: TC-REPORTS-053@1d35c83d
import { test, expect } from '../evidence';
import { entry, list } from '../support/api';
import { stubReports } from '../support/reports';

test('TC-REPORTS-053: Assumed days per point (REQ-REPORTS-018)', async ({ page, ev }) => {
  // Precondition: alpha's days_per_point is { value: 1.0, measured_epics: 0, assumed: true }.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubReports(page, { projects: ['alpha'], milestones: list([entry('m1')], { days_per_point: { value: 1.0, measured_epics: 0, assumed: true } }) });

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open `/reports/velocity?project=alpha`', async () => {
    await page.goto('/reports/velocity?project=alpha');
    const panel = page.getByRole('region', { name: 'Velocity' });
    await expect(panel.getByText('1.0 days per point')).toBeVisible();
    await expect(panel.getByText('assumed')).toBeVisible();
  });
});
