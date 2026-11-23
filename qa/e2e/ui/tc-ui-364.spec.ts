// TC: TC-UI-364@72c3b967
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';

test('TC-UI-364: Enter on a phone card', async ({ page, ev }) => {
  // Precondition: the Board of project example at 390px wide; focus is on the card of t-1.
  const beads = [bead('t-1', { title: 'Pay invoices', ready: true, priority: 1 })];
  await stubApi(page, { projects: ['example'], beads });
  await stubDetails(page, beads, 'example');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/beads?project=example&milestone=all&view=board');
  const card = page.locator('[data-card][data-id="t-1"]');
  await card.focus();
  await expect(card).toBeFocused();

  await ev.step('1. Press Enter', async () => {
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/beads\/example\/t-1$/);
    await expect(page.getByRole('heading', { name: 'Pay invoices' })).toBeVisible();
  });
});
