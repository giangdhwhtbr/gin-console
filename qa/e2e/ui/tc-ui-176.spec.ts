// TC: TC-UI-176@35270c1a
import { test, expect } from '../evidence';
import { E12, stubExample } from '../support/lanes';

test('TC-UI-176: Merge gate node', async ({ page, ev }) => {
  // Precondition: an open merge gate waits for track 2 of lane be in epic ex-e12.
  // KNOWN PRODUCT BUG (gin-console-9ix, reported with Track 7): BeadsView builds `matched` from the beads without merge
  // gates, so scopeGraph never keeps a gate and the Graph draws no gate node (GraphView.test passes gates in `matched`).
  // Remove this line when the Graph draws the gate; Playwright then reports "expected to fail but passed".
  test.fail(true, 'Graph does not draw merge gate nodes: BeadsView leaves the gates out of `matched`');
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&view=graph&scope=ex-e12', async () => {
    await page.goto('/beads?project=example&view=graph&scope=ex-e12');
    const gate = page.locator(`[data-node="${E12}.9"]`);
    await expect(gate).toBeVisible();
    await expect(gate).toHaveClass(/border-dashed/);
    await expect(gate.locator('svg.lucide-git-merge')).toBeVisible();
    await expect(gate).toContainText('Waits for be #2 to merge');
    await expect(gate).toContainText('Waiting');
  });
});
