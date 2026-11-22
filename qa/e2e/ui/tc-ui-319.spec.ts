// TC: TC-UI-319@609010a0
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-319: Focus ring is in the identity colour', async ({ page, ev }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await stubApi(page, { beads: [bead('P-1', { title: 'First bead' })] });

  await ev.step('1. Open `/beads?project=P&view=list`', async () => {
    await page.goto('/beads?project=P&view=list');
    await expect(page.getByRole('link', { name: 'First bead' })).toBeVisible();
  });

  await ev.step('2. Press Tab until a link has keyboard focus', async () => {
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      if (await page.evaluate(() => document.activeElement?.tagName === 'A' && document.activeElement.matches(':focus-visible'))) break;
    }
    await expect(page.locator('a:focus-visible').first()).toBeVisible();
  });

  await ev.step('3. Read the computed outline or box-shadow of the focused link', async () => {
    const link = page.locator('a:focus-visible').first();
    await expect(link).toHaveCSS('outline-style', 'solid');
    await expect(link).toHaveCSS('outline-color', 'rgb(106, 61, 184)');
  });
});
