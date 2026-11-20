// TC: TC-UI-167@48d71313
import { test, expect } from '../evidence';
import { arrowBetween, E12, geometry, stubExample } from '../support/lanes';

test('TC-UI-167: Arrow inside a lane', async ({ page, ev }) => {
  // Precondition: track 2 of lane be is blocked by track 1.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&view=lanes&scope=ex-e12', async () => {
    await page.goto('/beads?project=example&view=lanes&scope=ex-e12');
    await expect(page.getByTestId('lanes-canvas')).toBeVisible();
    const g = await geometry(page);
    // An arrow runs from track 1 to track 2, a straight run between neighbouring columns.
    const arrow = arrowBetween(g, `${E12}.1`, `${E12}.2`);
    expect(arrow).toBeDefined();
    expect(arrow).toHaveLength(2);
    // The arrow has no marker: the two markers belong to the merge gates of track 4.
    expect(Object.keys(g.markers).sort()).toEqual([`${E12}.9`, 'ex-g3']);
    for (const m of Object.values(g.markers)) {
      expect(m.x > Math.max(...arrow!.map((p) => p.x)) || m.y > Math.max(...arrow!.map((p) => p.y)) || m.y + m.h < Math.min(...arrow!.map((p) => p.y))).toBe(true);
    }
  });
});
