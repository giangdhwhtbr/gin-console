// TC: TC-UI-179@9125ad97
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
    // the first tier: be, fe and infra share a top edge, left to right in lane order
    expect(Math.abs(fe.y - be.y)).toBeLessThan(2);
    expect(Math.abs(infra.y - be.y)).toBeLessThan(2);
    expect(be.x).toBeLessThan(fe.x);
    expect(fe.x).toBeLessThan(infra.x);
    // the second tier: qa under them, followed by "No lane" in the same tier
    expect(qa.y).toBeGreaterThan(be.y + Math.max(be.h, fe.h, infra.h) - 1);
    expect(Math.abs(none.y - qa.y)).toBeLessThan(2);
    expect(none.x).toBeGreaterThan(qa.x + qa.w);
    await expect(page.getByRole('region', { name: 'Lane No lane' })).toHaveClass(/border-dashed/);
    await expect(page.locator('[data-node]').filter({ hasText: 'Waits for' })).toHaveCount(0);
    expect(graphCollisions(g)).toEqual([]);
  });
});
