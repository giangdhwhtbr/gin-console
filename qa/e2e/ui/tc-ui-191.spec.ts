// TC: TC-UI-191@ea96a964
import { test, expect } from '../evidence';
import { E12, graphGeometry, openGraph, stubExample } from '../support/lanes';

test('TC-UI-191: No chip inside a lane box', async ({ page, ev }) => {
  // Precondition: ex-e12 has lane be with tracks 1 and 2; track 2 is ex-e12.2.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&milestone=all&view=graph&scope=ex-e12', async () => {
    await openGraph(page);
    const g = await graphGeometry(page);
    const card = g.cards[`${E12}.2`];
    const be = g.boxes.be;
    expect(card.x).toBeGreaterThanOrEqual(be.x);
    expect(card.x + card.w).toBeLessThanOrEqual(be.x + be.w);
    expect(card.y).toBeGreaterThanOrEqual(be.y);
    expect(card.y + card.h).toBeLessThanOrEqual(be.y + be.h);
    await expect(page.getByRole('region', { name: 'Lane be' }).getByRole('heading', { name: 'be' })).toBeVisible();
    await expect(page.locator(`[data-node="${E12}.2"]`).locator('[data-hint^="Lane be"]')).toHaveCount(0);
  });
});
