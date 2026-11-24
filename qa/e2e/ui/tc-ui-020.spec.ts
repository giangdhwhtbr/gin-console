// TC: TC-UI-020@1a2bc481
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-020: Period kept across sections (REQ-UI-088)', async ({ page, ev }) => {
  // Precondition: the Reports page for alpha with 7 days picked on the Delivery section; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, { projects: ['alpha'] });

  await ev.step('0. Open `/reports/delivery?project=alpha&days=7`', async () => {
    await page.goto('/reports/delivery?project=alpha&days=7');
    await expect(page.getByRole('link', { name: /^Delivery/ })).toHaveAttribute('aria-current', 'page');
  });

  await ev.step('1. Open the Team section', async () => {
    await page.getByRole('link', { name: /^Team/ }).click();
    await expect(page.getByRole('link', { name: /^Team/ })).toHaveAttribute('aria-current', 'page');
  });

  await ev.step('2. Open the Rework section', async () => {
    await page.getByRole('link', { name: /^Rework/ }).click();
    await expect(page).toHaveURL(/\/reports\/rework\?.*days=7/);
    await expect(page.getByRole('combobox', { name: 'Report scope' })).toHaveValue('days:7');
  });
});
