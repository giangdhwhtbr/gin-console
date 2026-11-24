// TC: TC-UI-031@f8330d6e
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-031: Keyboard (REQ-UI-095)', async ({ page, ev }) => {
  // Precondition: the Delivery section is open and has focus; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, { projects: ['alpha'] });

  await ev.step('0. Open `/reports/delivery?project=alpha` and focus Delivery', async () => {
    await page.goto('/reports/delivery?project=alpha');
    const delivery = page.getByRole('link', { name: /^Delivery/ });
    await expect(delivery).toHaveAttribute('aria-current', 'page');
    await delivery.focus();
    await expect(delivery).toBeFocused();
  });

  await ev.step('1. Press Tab', async () => {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /^Velocity/ })).toBeFocused();
  });

  await ev.step('2. Press Enter', async () => {
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/reports\/velocity/);
    await expect(page.getByRole('link', { name: /^Velocity/ })).toHaveAttribute('aria-current', 'page');
  });
});
