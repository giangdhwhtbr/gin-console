// TC: TC-UI-359@29aee749
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';

test('TC-UI-359: Click the selected card again', async ({ page, ev }) => {
  // Precondition: t-1 is selected on the Board at 1280px wide.
  const beads = [bead('t-1', { title: 'Pay invoices', ready: true, priority: 1 })];
  await stubApi(page, { projects: ['example'], beads });
  await stubDetails(page, beads, 'example');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/beads?project=example&milestone=all&view=board&select=t-1');
  const card = page.locator('[data-card][data-id="t-1"]');
  const panel = page.getByRole('complementary', { name: 'Bead details' });
  await expect(panel.getByRole('heading', { name: 'Pay invoices' })).toBeVisible();
  const url = page.url();
  const length = await page.evaluate(() => history.length);

  await ev.step('1. Click the card of t-1 again', async () => {
    await card.click({ position: { x: 6, y: 6 } });
    await expect(card).toHaveAttribute('aria-current', 'true');
    await expect(panel.getByRole('heading', { name: 'Pay invoices' })).toBeVisible();
    expect(page.url()).toBe(url);
    expect(await page.evaluate(() => history.length)).toBe(length);
  });
});
