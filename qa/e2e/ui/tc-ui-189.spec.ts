// TC: TC-UI-189@5fb9f66c
import { test, expect } from '../evidence';
import { E12, endsOf, graphCollisions, graphGeometry, noLaneLinks, onTopEdge, openGraph, stubExample, within } from '../support/lanes';

test('TC-UI-189: No lane box with dependencies', async ({ page, ev }) => {
  // Precondition: lanes be (tracks 1, 2) and fe (track 3), tracks 7 and 8 without a lane; track 7 waits for track 2, track 3 for track 8.
  await stubExample(page, noLaneLinks());
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&milestone=all&view=graph&scope=ex-e12', async () => {
    await openGraph(page);
    const g = await graphGeometry(page);
    const none = g.boxes[''];
    // the "No lane" box is in the tier after the be box
    expect(none.y).toBeGreaterThan(g.boxes.be.y + g.boxes.be.h - 1);
    // an arrow from track 2 to the top edge of the "No lane" box
    const toNone = g.arrows[`${E12}.2>${E12}.7`];
    expect(toNone).toBeDefined();
    expect(within(endsOf(toNone).start, g.cards[`${E12}.2`])).toBe(true);
    expect(onTopEdge(endsOf(toNone).end, none)).toBe(true);
    // another arrow from track 8 to the top edge of the fe box
    const toFe = g.arrows[`${E12}.8>${E12}.3`];
    expect(toFe).toBeDefined();
    expect(within(endsOf(toFe).start, g.cards[`${E12}.8`])).toBe(true);
    expect(onTopEdge(endsOf(toFe).end, g.boxes.fe)).toBe(true);
    expect(graphCollisions(g)).toEqual([]);
  });
});
