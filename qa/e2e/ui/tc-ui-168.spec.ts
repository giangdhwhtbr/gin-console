// TC: TC-UI-168@67110a4b
import { test, expect } from '../evidence';
import { e12, E12, gate, geometry, plain, stubExample } from '../support/lanes';

test('TC-UI-168: Merge gate for a track not drawn', async ({ page, ev }) => {
  // Precondition: a merge gate titled `external: .planning/plans/other.md#7` blocks track 4 and matches no child of the scope.
  const beads = e12().map((b) => (b.id === `${E12}.4` ? { ...b, blocked_by: [...b.blocked_by, 'ex-g7'], dependency_count: 3 } : b));
  const other = gate('ex-g7', 7, null, null, { title: 'external: .planning/plans/other.md#7' });
  other.waits_for = { plan: '.planning/plans/other.md', number: 7, track_id: null, lane: null };
  await stubExample(page, [...beads, other, ...plain()]);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&view=lanes&scope=ex-e12', async () => {
    await page.goto('/beads?project=example&view=lanes&scope=ex-e12');
    await expect(page.getByTestId('lanes-canvas').locator('[data-marker]')).toHaveCount(3);
    const g = await geometry(page);
    // No arrow is drawn for the gate: the arrows are the three of track 1 -> 2 and the two gates that match a track.
    expect(g.arrows).toHaveLength(3);
    // The marker is drawn above the card of track 4.
    const marker = g.markers['ex-g7'];
    const card = g.cards[`${E12}.4`];
    expect(marker.text).toBe('Waiting for track 7');
    expect(marker.y + marker.h).toBeLessThanOrEqual(card.y);
    expect(marker.x).toBeGreaterThanOrEqual(card.x - 1);
    expect(marker.x).toBeLessThan(card.x + card.w);
  });
});
