// TC: TC-UI-184@d53890a0
import { test, expect } from '../evidence';
import { E12, graphGeometry, openGraph, stubExample } from '../support/lanes';

test('TC-UI-184: Arrow keys move between lane boxes', async ({ page, ev }) => {
  // Precondition: ex-e12 has lanes be, fe, infra, qa and two tracks without a lane; an arrow leads from track 2 to track 4 through the open merge gate.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&milestone=all&view=graph&scope=ex-e12', async () => {
    await openGraph(page);
    expect(Object.keys((await graphGeometry(page)).arrows)).toContain(`${E12}.2>${E12}.4`);
  });

  await ev.step('2. Focus the card of track 2 in the be box', async () => {
    const two = page.locator(`[data-node="${E12}.2"]`);
    await two.focus();
    await expect(two).toBeFocused();
    // the card is in the be box
    const g = await graphGeometry(page);
    expect(g.cards[`${E12}.2`].x).toBeGreaterThan(g.boxes.be.x);
    expect(g.cards[`${E12}.2`].x).toBeLessThan(g.boxes.be.x + g.boxes.be.w);
  });

  await ev.step('3. Press Arrow Down', async () => {
    await page.keyboard.press('ArrowDown');
    const four = page.locator(`[data-node="${E12}.4"]`);
    await expect(four).toBeFocused();
    const g = await graphGeometry(page);
    expect(g.cards[`${E12}.4`].x).toBeGreaterThanOrEqual(g.boxes.qa.x);
    expect(g.cards[`${E12}.4`].x).toBeLessThan(g.boxes.qa.x + g.boxes.qa.w);
    // The Graph's arrow keys move the focus only (unlike the Lanes view); Enter selects the focused card.
    await expect(four).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Enter');
    await expect(four).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(new RegExp(`select=${E12}\\.4`));
    await expect(page.getByRole('complementary', { name: 'Bead details' }).getByRole('heading', { name: 'Track 4' })).toBeVisible();
  });
});
