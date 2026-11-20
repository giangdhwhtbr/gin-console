// TC: TC-UI-166@5aa640a6
import { test, expect } from '../evidence';
import { arrowBetween, collisions, crosses, E12, geometry, stubExample } from '../support/lanes';

test('TC-UI-166: Arrows and markers of merge gates', async ({ page, ev }) => {
  // Precondition: track 4 of lane qa in ex-e12 is blocked by an open merge gate for track 2 and a closed merge gate for track 3.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&view=lanes&scope=ex-e12', async () => {
    await page.goto('/beads?project=example&view=lanes&scope=ex-e12');
    await expect(page.getByTestId('lanes-canvas').locator('[data-marker]')).toHaveCount(2);
    const g = await geometry(page);
    // An arrow runs from track 2 to track 4 with the marker "Waiting".
    const fromTwo = arrowBetween(g, `${E12}.2`, `${E12}.4`);
    expect(fromTwo).toBeDefined();
    expect(g.markers[`${E12}.9`].text).toBe('Waiting');
    expect(crosses(fromTwo!, { ...g.markers[`${E12}.9`], x: g.markers[`${E12}.9`].x - 2, w: g.markers[`${E12}.9`].w + 4, y: g.markers[`${E12}.9`].y - 2, h: g.markers[`${E12}.9`].h + 4 })).toBe(true);
    // An arrow runs from track 3 to track 4 with the marker "Merged".
    const fromThree = arrowBetween(g, `${E12}.3`, `${E12}.4`);
    expect(fromThree).toBeDefined();
    expect(g.markers['ex-g3'].text).toBe('Merged');
    const merged = g.markers['ex-g3'];
    expect(crosses(fromThree!, { ...merged, x: merged.x - 2, w: merged.w + 4, y: merged.y - 2, h: merged.h + 4 })).toBe(true);
    // No arrow segment or marker crosses a card or a header.
    expect(collisions(g)).toEqual([]);
  });
});
