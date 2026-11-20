// TC: TC-UI-190@12c352ec
import { test, expect } from '../evidence';
import { E12, graphCollisions, graphGeometry, loop, openGraph, stubExample } from '../support/lanes';

test('TC-UI-190: Lanes in a loop', async ({ page, ev }) => {
  // Precondition: lane x has track 1 and lane y has track 2; each track is blocked by the other.
  await stubExample(page, loop());
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&milestone=all&view=graph&scope=ex-e12', async () => {
    await openGraph(page);
    const g = await graphGeometry(page);
    const { x, y } = g.boxes;
    // x and y are in the same tier (one column)
    expect(Math.abs(x.x - y.x)).toBeLessThan(2);
    // both arrows run in the channel below the boxes
    const bottom = Math.max(x.y + x.h, y.y + y.h);
    const arrows = Object.entries(g.arrows);
    expect(arrows.map(([id]) => id).sort()).toEqual([`${E12}.1>${E12}.2`, `${E12}.2>${E12}.1`]);
    for (const [, points] of arrows) expect(Math.max(...points.map((p) => p.y))).toBeGreaterThan(bottom);
    // the cycle warning names x and y
    await expect(page.getByRole('status').filter({ hasText: 'Dependency cycle' })).toHaveText(/^Dependency cycle between x, y(,|$)/);
    expect(graphCollisions(g)).toEqual([]);
  });
});
