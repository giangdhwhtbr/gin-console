// TC: TC-UI-366@c53a8bf1
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';

test('TC-UI-366: Escape clears the selection', async ({ page, ev }) => {
  // Precondition: t-1 is selected on the Board at 1280px wide; the card of t-1 has focus.
  const beads = [bead('t-1', { title: 'Pay invoices', ready: true, priority: 1 })];
  await stubApi(page, { projects: ['example'], beads });
  await stubDetails(page, beads, 'example');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/beads?project=example&milestone=all&view=board&select=t-1');
  const card = page.locator('[data-card][data-id="t-1"]');
  const panel = page.getByRole('complementary', { name: 'Bead details' });
  await expect(panel.getByRole('heading', { name: 'Pay invoices' })).toBeVisible();
  await card.focus();
  await expect(card).toBeFocused();

  await ev.step('1. Press Esc', async () => {
    await page.keyboard.press('Escape');
    await expect(page).not.toHaveURL(/select=/);
    await expect(panel).toHaveCount(0);
    await expect(card).toBeFocused();
  });
});
