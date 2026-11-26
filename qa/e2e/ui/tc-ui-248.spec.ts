// TC: TC-UI-248@e2a46eaa
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';
import { mainNav } from '../support/shell';

test('TC-UI-248: Narrow window (REQ-UI-129)', async ({ page, ev }) => {
  // Precondition: project a has a report; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, { projects: ['a'] });

  await ev.step('1. Open `/reports/delivery?project=a`', async () => {
    await page.goto('/reports/delivery?project=a');
    const strip = page.getByRole('navigation', { name: 'Report sections' });
    await expect(strip).toBeVisible();
    await expect(strip.getByRole('link')).toHaveCount(6);
    await expect(mainNav(page).getByRole('list', { name: 'Report sections' })).toHaveCount(0);
  });
});
