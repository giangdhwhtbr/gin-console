// TC: TC-UI-247@67d9f791
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';
import { mainNav } from '../support/shell';

test('TC-UI-247: Change section (REQ-UI-129)', async ({ page, ev }) => {
  // Precondition: project a has a report; the window is 1440px wide and the sidebar is expanded.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubReports(page, { projects: ['a'] });
  const sections = mainNav(page).getByRole('list', { name: 'Report sections' });

  await ev.step('1. Open `/reports/delivery?project=a&days=7`', async () => {
    await page.goto('/reports/delivery?project=a&days=7');
    await expect(sections.getByRole('link', { name: /^Delivery/ })).toHaveAttribute('aria-current', 'page');
  });

  await ev.step('2. Click "Rework" in the sidebar', async () => {
    await sections.getByRole('link', { name: /^Rework/ }).click();
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/reports/rework?project=a&days=7');
    await expect(sections.getByRole('link', { name: /^Rework/ })).toHaveAttribute('aria-current', 'page');
    const panel = page.getByRole('region', { name: 'Rework', exact: true });
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Rework rate')).toBeVisible();
  });
});
