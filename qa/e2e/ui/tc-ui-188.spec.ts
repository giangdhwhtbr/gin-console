// TC: TC-UI-188@52a9d3d1
import { test, expect } from '../evidence';
import { E12, graphCollisions, graphGeometry, openGraph, passesThrough, stubExample } from '../support/lanes';

test('TC-UI-188: Merge gate label in lane boxes', async ({ page, ev }) => {
  // Precondition: track 4 of lane qa waits for an open merge gate for track 2 of lane be and a closed one for track 3 of fe.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&milestone=all&view=graph&scope=ex-e12', async () => {
    await openGraph(page);
    await expect(page.locator('[data-node]').filter({ hasText: 'Waits for be #2 to merge' })).toHaveCount(0);
    await expect(page.locator(`[data-node="${E12}.9"]`)).toHaveCount(0);
    const g = await graphGeometry(page);
    const chip = page.locator('[data-chip]').filter({ hasText: 'Waiting for be #2' });
    await expect(chip).toHaveCount(1);
    await expect(chip).toHaveAttribute('data-chip', `${E12}.9`);
    expect(passesThrough(g.arrows[`${E12}.2>${E12}.4`], g.chips[`${E12}.9`], 0)).toBe(true);
    expect(graphCollisions(g)).toEqual([]);
  });
});
