// TC: TC-UI-358@aa71e3c0
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';

test('TC-UI-358: Select a card with one click', async ({ page, ev }) => {
  // Precondition: the Board of project example at 1280px wide with bead t-1.
  const beads = [bead('t-1', { title: 'Pay invoices', ready: true, priority: 1 })];
  await stubApi(page, { projects: ['example'], beads });
  await stubDetails(page, beads, 'example');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/beads?project=example&milestone=all&view=board');
  const card = page.locator('[data-card][data-id="t-1"]');
  await expect(card).toBeVisible();

  await ev.step('1. Click the card of t-1 outside its title', async () => {
    await card.click({ position: { x: 6, y: 6 } });
    await expect(page).toHaveURL(/[?&]select=t-1(&|$)/);
    await expect(card).toHaveAttribute('aria-current', 'true');
    await expect(card).toHaveClass(/bg-identity-wash/);
    expect(await card.evaluate((el) => getComputedStyle(el).boxShadow)).toMatch(/inset/);
    const panel = page.getByRole('complementary', { name: 'Bead details' });
    await expect(panel.getByRole('heading', { name: 'Pay invoices' })).toBeVisible();
  });
});
