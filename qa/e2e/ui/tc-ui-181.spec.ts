// TC: TC-UI-181@e1f29adf
import { test, expect } from '../evidence';
import { E12, endsOf, graphCollisions, graphGeometry, onTopEdge, openGraph, passesThrough, showClosed, stubExample, within } from '../support/lanes';

test('TC-UI-181: Gate chips on the arrows to a lane box', async ({ page, ev }) => {
  // Precondition: track 4 of lane qa waits for an open merge gate for track 2 of be and a closed one for track 3 of fe.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&milestone=all&view=graph&scope=ex-e12', async () => {
    await openGraph(page);
  });

  await ev.step('2. Turn "Show closed" on', async () => {
    await showClosed(page);
    const g = await graphGeometry(page);
    const qa = g.boxes.qa;
    // a dashed arrow from track 2 to the top edge of the qa box, carrying "Waiting · be #2"
    const open = g.arrows[`${E12}.2>${E12}.4`];
    expect(open).toBeDefined();
    expect(within(endsOf(open).start, g.cards[`${E12}.2`])).toBe(true);
    expect(onTopEdge(endsOf(open).end, qa)).toBe(true);
    await expect(page.locator(`path[data-arrow="${E12}.2>${E12}.4"]`)).toHaveAttribute('stroke-dasharray', /\d/);
    const waiting = page.locator(`[data-chip="${E12}.9"]`);
    await expect(waiting).toHaveText('Waiting · be #2');
    expect(passesThrough(open, g.chips[`${E12}.9`], 0)).toBe(true);
    // an arrow from track 3 to the top edge of the qa box, carrying "Merged · fe #3"
    const merged = g.arrows[`${E12}.3>${E12}.4`];
    expect(merged).toBeDefined();
    expect(within(endsOf(merged).start, g.cards[`${E12}.3`])).toBe(true);
    expect(onTopEdge(endsOf(merged).end, qa)).toBe(true);
    await expect(page.locator(`path[data-arrow="${E12}.3>${E12}.4"]`)).not.toHaveAttribute('stroke-dasharray', /\d/);
    await expect(page.locator('[data-chip="ex-g3"]')).toHaveText('Merged · fe #3');
    expect(passesThrough(merged, g.chips['ex-g3'], 0)).toBe(true);
    // no node for either gate
    await expect(page.locator(`[data-node="${E12}.9"]`)).toHaveCount(0);
    await expect(page.locator('[data-node="ex-g3"]')).toHaveCount(0);
    expect(graphCollisions(g)).toEqual([]);
  });
});
