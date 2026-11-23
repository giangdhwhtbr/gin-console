// TC: TC-UI-327@2ab2dc11
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubBeadPages } from '../support/shell';

const beads = [
  bead('e-1', { title: 'Epic one', issue_type: 'epic' }),
  bead('t-1', { title: 'Task one', parent: 'e-1', ready: true }),
  bead('t-2', { title: 'Task two', parent: 'e-1', ready: true }),
];

test('TC-UI-327: List roles (REQ-UI-046)', async ({ page, ev }) => {
  // Precondition: the List view at 1280px wide with an open epic e-1 that has children t-1 and t-2.
  await page.setViewportSize({ width: 1280, height: 900 });
  await stubApi(page, { projects: ['example'], beads });
  await page.goto('/beads?project=example');
  await page.getByRole('button', { name: 'Expand e-1' }).click();
  await expect(page.getByRole('button', { name: 'Collapse e-1' })).toBeVisible();

  await ev.step('1. Read the accessibility tree of the List', async () => {
    const tree = page.getByRole('tree');
    await expect(tree).toBeVisible();
    const epic = tree.locator('[role="treeitem"][data-id="e-1"]');
    await expect(epic).toHaveAttribute('aria-expanded', 'true');
    const level = Number(await epic.getAttribute('aria-level'));
    for (const id of ['t-1', 't-2']) {
      const row = tree.locator(`[role="treeitem"][data-id="${id}"]`);
      await expect(row).toBeVisible();
      expect(Number(await row.getAttribute('aria-level'))).toBeGreaterThan(level);
    }
    await expect(tree.getByRole('treeitem')).toHaveCount(3);
  });
});
