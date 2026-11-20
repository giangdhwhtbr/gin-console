// TC: TC-UI-190@32af5079
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
    // x and y are in the same tier
    expect(Math.abs(x.y - y.y)).toBeLessThan(2);
    // both arrows run in the channel to the right of the boxes
    const right = Math.max(x.x + x.w, y.x + y.w);
    const arrows = Object.entries(g.arrows);
    expect(arrows.map(([id]) => id).sort()).toEqual([`${E12}.1>${E12}.2`, `${E12}.2>${E12}.1`]);
    for (const [, points] of arrows) expect(Math.max(...points.map((p) => p.x))).toBeGreaterThan(right);
    // the cycle warning names x and y
    await expect(page.getByRole('status').filter({ hasText: 'Dependency cycle' })).toHaveText(/^Dependency cycle between x, y(,|$)/);
    expect(graphCollisions(g)).toEqual([]);
  });
});
