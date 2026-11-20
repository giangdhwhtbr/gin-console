// TC: TC-UI-169@f6a2b6f1
import { test, expect } from '../evidence';
import { E12, stubExample } from '../support/lanes';

test('TC-UI-169: Moving between rows with the keyboard', async ({ page, ev }) => {
  // Precondition: lane be has track 2; lane fe is the row below with track 3 as its only card.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const two = page.locator(`[data-node="${E12}.2"]`);
  const three = page.locator(`[data-node="${E12}.3"]`);

  await ev.step('1. Open /beads?project=example&view=lanes&scope=ex-e12', async () => {
    await page.goto('/beads?project=example&view=lanes&scope=ex-e12');
    await expect(two).toBeVisible();
  });

  await ev.step('2. Focus the card of track 2', async () => {
    await two.focus();
    await expect(two).toBeFocused();
  });

  await ev.step('3. Press Arrow Down', async () => {
    await page.keyboard.press('ArrowDown');
    await expect(three).toBeFocused();
    await expect(three).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(new RegExp(`select=${E12}\\.3`));
    await expect(page.getByRole('complementary', { name: 'Bead details' }).getByRole('heading', { name: 'Track 3' })).toBeVisible();
  });
});
