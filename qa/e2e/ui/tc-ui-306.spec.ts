// TC: TC-UI-306@1d25ce3f
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-306: No strand without tracks', async ({ page, ev }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, { beads: [bead('e-3', { title: 'Epic e-3', issue_type: 'epic' })] });

  await ev.step('1. Open `/beads?project=P&view=list`', async () => {
    await page.goto('/beads?project=P&view=list');
    await expect(page.getByRole('link', { name: 'Epic e-3' })).toBeVisible();
  });

  await ev.step('2. Find the row of `e-3`', async () => {
    const row = page.locator('[role="treeitem"][data-id="e-3"]');
    await expect(row).toBeVisible();
    await expect(row.getByRole('img', { name: /tracks/ })).toHaveCount(0);
    await expect(row.locator('[data-strand]')).toHaveCount(0);
    await expect(row).not.toContainText('0/0');
  });
});
