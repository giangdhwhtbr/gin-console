// TC: TC-UI-182@62b5fd7d
import { test, expect } from '../evidence';
import { external, graphCollisions, graphGeometry, openGraph, stubExample } from '../support/lanes';

test('TC-UI-182: Gate chip for a track that is not drawn', async ({ page, ev }) => {
  // Precondition: lane qa has track 4; an open merge gate "external: .planning/plans/other.md#7" blocks it and its track is not in ex-e12.
  await stubExample(page, external());
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&milestone=all&view=graph&scope=ex-e12', async () => {
    await openGraph(page);
    const g = await graphGeometry(page);
    const qa = g.boxes.qa;
    const chip = g.chips['ex-g7'];
    await expect(page.locator('[data-chip="ex-g7"]')).toHaveText('Waiting for track 7');
    // the chip sits on the top edge of the qa box
    expect(Math.abs(chip.y + chip.h - qa.y)).toBeLessThan(3);
    expect(chip.x).toBeGreaterThanOrEqual(qa.x - 1);
    expect(chip.x).toBeLessThan(qa.x + qa.w);
    // no arrow and no node for the gate
    expect(Object.keys(g.arrows)).toEqual([]);
    await expect(page.locator('[data-node="ex-g7"]')).toHaveCount(0);
    expect(graphCollisions(g)).toEqual([]);
  });
});
