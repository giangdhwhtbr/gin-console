// TC: TC-UI-020@426309c5
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-020: Period kept across tabs (REQ-UI-088)', async ({ page, ev }) => {
  // Precondition: the Reports page for alpha with 7 days picked on the Delivery tab; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, { projects: ['alpha'] });

  await ev.step('0. Open `/reports?project=alpha&days=7&tab=delivery`', async () => {
    await page.goto('/reports?project=alpha&days=7&tab=delivery');
    await expect(page.getByRole('tab', { name: /^Delivery/ })).toHaveAttribute('aria-selected', 'true');
  });

  await ev.step('1. Select the Team tab', async () => {
    await page.getByRole('tab', { name: /^Team/ }).click();
    await expect(page.getByRole('tab', { name: /^Team/ })).toHaveAttribute('aria-selected', 'true');
  });

  await ev.step('2. Select the Quality tab', async () => {
    await page.getByRole('tab', { name: /^Quality/ }).click();
    await expect(page).toHaveURL(/days=7/);
    await expect(page.locator('#panel-quality').getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
  });
});
