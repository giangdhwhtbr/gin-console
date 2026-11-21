// TC: TC-UI-247@a9dd56aa
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';
import { mainNav } from '../support/shell';

test('TC-UI-247: Change section (REQ-UI-129)', async ({ page, ev }) => {
  // Precondition: project a has a report; the window is 1440px wide and the sidebar is expanded.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubReports(page, { projects: ['a'] });
  const sections = mainNav(page).getByRole('list', { name: 'Report sections' });

  await ev.step('1. Open `/reports?project=a&days=7&tab=delivery`', async () => {
    await page.goto('/reports?project=a&days=7&tab=delivery');
    await expect(sections.getByRole('link', { name: /^Delivery/ })).toHaveAttribute('aria-current', 'page');
  });

  await ev.step('2. Click "Quality" in the sidebar', async () => {
    await sections.getByRole('link', { name: /^Quality/ }).click();
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/reports?project=a&days=7&tab=quality');
    await expect(sections.getByRole('link', { name: /^Quality/ })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#panel-quality')).toBeVisible();
    await expect(page.locator('#panel-quality').getByText('Rework rate')).toBeVisible();
  });
});
