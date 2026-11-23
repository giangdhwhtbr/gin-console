// TC: TC-UI-367@9867e1bc
import { test, expect } from '../evidence';
import { E12, PROJECT } from '../support/lanes';
import { openEpicStubs } from '../support/epic';

test('TC-UI-367: Click and double click on an epic page tab', async ({ page, ev }) => {
  // Precondition: the Lanes tab of epic ex-e12 at 1440px wide with card ex-e12.2.
  await openEpicStubs(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/beads/${PROJECT}/${E12}?tab=lanes`);
  const card = page.locator(`[data-node="${E12}.2"]`);
  await expect(card).toBeVisible();

  await ev.step(`1. Click the card of ${E12}.2`, async () => {
    await card.click();
    await expect(page).toHaveURL(new RegExp(`select=${E12}\\.2(&|$)`));
    await expect(page.getByRole('complementary', { name: 'Bead details' }).getByRole('heading', { name: 'Track 2' })).toBeVisible();
  });

  await ev.step(`2. Double-click the card of ${E12}.2`, async () => {
    await card.dblclick();
    await expect(page).toHaveURL(new RegExp(`/beads/${PROJECT}/${E12}\\.2$`));
  });
});
