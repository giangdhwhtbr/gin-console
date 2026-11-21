// TC: TC-UI-031@15d22d24
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-031: Keyboard (REQ-UI-095)', async ({ page, ev }) => {
  // Precondition: the Delivery tab is selected and has focus; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, { projects: ['alpha'] });

  await ev.step('0. Open `/reports?project=alpha&tab=delivery` and focus the Delivery tab', async () => {
    await page.goto('/reports?project=alpha&tab=delivery');
    const delivery = page.getByRole('tab', { name: /^Delivery/ });
    await expect(delivery).toHaveAttribute('aria-selected', 'true');
    await delivery.focus();
    await expect(delivery).toBeFocused();
  });

  await ev.step('1. Press Right', async () => {
    await page.keyboard.press('ArrowRight');
    const velocity = page.getByRole('tab', { name: /^Velocity/ });
    await expect(velocity).toHaveAttribute('aria-selected', 'true');
    await expect(velocity).toBeFocused();
  });
});
