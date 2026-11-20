// TC: TC-UI-179@7c0c78a1
import { test, expect } from '../evidence';
import { E12, graphCollisions, graphGeometry, openGraph, showClosed, stubExample } from '../support/lanes';

test('TC-UI-179: Lane boxes in tiers', async ({ page, ev }) => {
  // Precondition: ex-e12 has lanes be, fe, infra, qa and two tracks without a lane; track 4 waits for an open and a closed merge gate.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&milestone=all&view=graph&scope=ex-e12', async () => {
    await openGraph(page);
    await expect(page).toHaveURL(new RegExp(`scope=${E12}`));
  });

  await ev.step('2. Turn "Show closed" on', async () => {
    await showClosed(page);
    await expect(page).toHaveURL(new RegExp(`scope=${E12}`));
    for (const lane of ['be', 'fe', 'infra', 'qa']) await expect(page.getByRole('region', { name: `Lane ${lane}` })).toBeVisible();
    const g = await graphGeometry(page);
    const { be, fe, infra, qa } = g.boxes;
    const none = g.boxes[''];
    expect(Object.keys(g.boxes).sort()).toEqual(['', 'be', 'fe', 'infra', 'qa']);
    // the first tier, on the left: be, fe and infra share a left edge, one under another in lane order
    expect(Math.abs(fe.x - be.x)).toBeLessThan(2);
    expect(Math.abs(infra.x - be.x)).toBeLessThan(2);
    expect(fe.y).toBeGreaterThan(be.y + be.h - 1);
    expect(infra.y).toBeGreaterThan(fe.y + fe.h - 1);
    // the second tier: qa to their right, followed by "No lane" under it in the same tier
    expect(qa.x).toBeGreaterThan(Math.max(be.x + be.w, fe.x + fe.w, infra.x + infra.w) - 1);
    expect(Math.abs(none.x - qa.x)).toBeLessThan(2);
    expect(none.y).toBeGreaterThan(qa.y + qa.h - 1);
    await expect(page.getByRole('region', { name: 'Lane No lane' })).toHaveClass(/border-dashed/);
    await expect(page.locator('[data-node]').filter({ hasText: 'Waits for' })).toHaveCount(0);
    expect(graphCollisions(g)).toEqual([]);
  });
});
