// TC: TC-UI-180@0d29a8b5
import { test, expect } from '../evidence';
import { E12, e12Open, endsOf, graphCollisions, graphGeometry, openGraph, stubExample, within } from '../support/lanes';

test('TC-UI-180: Tracks left to right in a lane box', async ({ page, ev }) => {
  // Precondition: lane be has tracks 1 and 2 (both open here, so the Graph draws them), and track 2 is blocked by track 1.
  await stubExample(page, e12Open());
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&milestone=all&view=graph&scope=ex-e12', async () => {
    await openGraph(page);
    const g = await graphGeometry(page);
    const one = g.cards[`${E12}.1`];
    const two = g.cards[`${E12}.2`];
    const be = g.boxes.be;
    // both cards are inside the be box, track 2 to the right of track 1
    for (const card of [one, two]) {
      expect(card.x).toBeGreaterThanOrEqual(be.x);
      expect(card.x + card.w).toBeLessThanOrEqual(be.x + be.w);
      expect(card.y).toBeGreaterThanOrEqual(be.y);
      expect(card.y + card.h).toBeLessThanOrEqual(be.y + be.h);
    }
    expect(two.x).toBeGreaterThanOrEqual(one.x + one.w);
    // an arrow leaves track 1 and enters track 2
    const arrow = g.arrows[`${E12}.1>${E12}.2`];
    expect(arrow).toBeDefined();
    const { start, end } = endsOf(arrow);
    expect(within(start, one)).toBe(true);
    expect(within(end, two)).toBe(true);
    expect(graphCollisions(g)).toEqual([]);
  });
});
