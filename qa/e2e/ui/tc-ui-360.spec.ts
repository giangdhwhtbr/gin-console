// TC: TC-UI-360@5d14b269
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';

test('TC-UI-360: Tap a card on a phone', async ({ page, ev }) => {
  // Precondition: the Focus view of project example at 390px wide with bead t-1.
  const beads = [bead('t-1', { title: 'Pay invoices', ready: true, priority: 1 })];
  await stubApi(page, { projects: ['example'], beads });
  await stubDetails(page, beads, 'example');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/beads?project=example&milestone=all&view=focus');
  const card = page.locator('[data-card][data-id="t-1"]');
  await expect(card).toBeVisible();

  await ev.step('1. Tap the card of t-1', async () => {
    await card.click({ position: { x: 6, y: 6 } });
    await expect(page).toHaveURL(/\/beads\/example\/t-1/);
    await expect(page.getByRole('heading', { name: 'Pay invoices' })).toBeVisible();
  });

  await ev.step('2. Use the browser Back button', async () => {
    await page.goBack();
    await expect(page).toHaveURL(/view=focus/);
    await expect(page.locator('[data-card][data-id="t-1"]')).toBeFocused();
  });
});
