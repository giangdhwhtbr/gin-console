// TC: TC-UI-369@1844bbef
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';

test('TC-UI-369: Close details on the Focus view', async ({ page, ev }) => {
  // Precondition: t-1 is selected on the Focus view at 1280px wide.
  const beads = [bead('t-1', { title: 'Pay invoices', ready: true, priority: 1 })];
  await stubApi(page, { projects: ['example'], beads });
  await stubDetails(page, beads, 'example');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/beads?project=example&milestone=all&view=focus&select=t-1');
  const panel = page.getByRole('complementary', { name: 'Bead details' });
  await expect(panel.getByRole('heading', { name: 'Pay invoices' })).toBeVisible();

  await ev.step('1. Click "Close details"', async () => {
    await panel.getByRole('button', { name: 'Close details' }).click();
    await expect(page).not.toHaveURL(/select=/);
    await expect(panel).toHaveCount(0);
    const region = (await page.getByRole('region', { name: 'Next up' }).boundingBox())!;
    const main = (await page.getByRole('main').boundingBox())!;
    expect(region.x + region.width).toBeGreaterThan(main.x + main.width * 0.5);
    await expect(page.locator('[data-card][data-id="t-1"]')).toBeFocused();
  });
});
