// TC: TC-UI-176@95a3c688
import { test, expect } from '../evidence';
import { showClosed, stubExample } from '../support/lanes';

test('TC-UI-176: Merge gate node', async ({ page, ev }) => {
  // Precondition: the merge gate ex-g3 is closed, has no parent and waits for track 3 of lane fe.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&milestone=all&view=graph', async () => {
    await page.goto('/beads?project=example&milestone=all&view=graph');
    // closed beads are hidden until "Show closed" is on, so the project Graph has nothing to draw yet
    await expect(page.getByText('No beads match these filters')).toBeVisible();
    await expect(page.locator('[data-node="ex-g3"]')).toHaveCount(0);
  });

  await ev.step('2. Turn "Show closed" on', async () => {
    await showClosed(page);
    const gate = page.locator('[data-node="ex-g3"]');
    await expect(gate).toBeVisible();
    await expect(gate).toHaveClass(/border-dashed/);
    await expect(gate.locator('svg.lucide-git-merge')).toBeVisible();
    await expect(gate).toContainText('Waits for fe #3 to merge');
    await expect(gate).toContainText('Merged');
  });
});
