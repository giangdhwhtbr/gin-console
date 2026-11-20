// TC: TC-UI-175@b0001800
import { test, expect } from '../evidence';
import { E12, e12, plain, stubExample } from '../support/lanes';

test('TC-UI-175: Merge gates not counted as children', async ({ page, ev }) => {
  // Precondition: epic ex-e12 has 8 tracks (all open here) and a merge gate whose parent is ex-e12.
  // ex-e12 waits for ex-e3, so the unscoped Graph (which draws linked beads only) shows its node.
  const beads = e12()
    .filter((b) => b.id !== 'ex-g3')
    .map((b) => (b.status === 'closed' ? { ...b, status: 'open', closed_at: null } : b))
    .map((b) => (b.id === E12 ? { ...b, blocked_by: ['ex-e3'], dependency_count: 1 } : b));
  expect(beads.filter((b) => b.parent === E12 && b.waits_for === null)).toHaveLength(8);
  expect(beads.filter((b) => b.parent === E12 && b.waits_for !== null)).toHaveLength(1);
  await stubExample(page, [...beads, ...plain()]);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open the Graph view without a scope', async () => {
    await page.goto('/beads?project=example&milestone=all&view=graph');
    const node = page.locator(`[data-node="${E12}"]`);
    await expect(node).toBeVisible();
    await expect(node).toContainText('0 of 8 done');
  });
});
