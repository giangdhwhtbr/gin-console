// TC: TC-UI-248@854e0c44
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';
import { mainNav } from '../support/shell';

test('TC-UI-248: Narrow window (REQ-UI-129)', async ({ page, ev }) => {
  // Precondition: project a has a report; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, { projects: ['a'] });

  await ev.step('1. Open `/reports?project=a&tab=delivery`', async () => {
    await page.goto('/reports?project=a&tab=delivery');
    await expect(page.getByRole('tablist', { name: 'Report' })).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(4);
    await expect(mainNav(page).getByRole('list', { name: 'Report sections' })).toHaveCount(0);
  });
});
