// TC: TC-UI-307@670ee4e0
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-307: Prep tasks are shown apart from the strand', async ({ page, ev }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, {
    beads: [
      bead('e-4', { title: 'Epic e-4', issue_type: 'epic' }),
      bead('t-1', { title: 'Track t-1', parent: 'e-4', status: 'closed', closed_at: '2026-10-09T00:00:00Z', labels: ['track:1'] }),
      bead('t-2', { title: 'Track t-2', parent: 'e-4', ready: true, labels: ['track:2'] }),
      bead('p-1', { title: 'Prep p-1', parent: 'e-4', ready: true, labels: ['prep'] }),
    ],
  });

  await ev.step('1. Open `/beads?project=P&view=list`', async () => {
    await page.goto('/beads?project=P&view=list');
    await expect(page.getByRole('link', { name: 'Epic e-4' })).toBeVisible();
  });

  await ev.step('2. Find the row of `e-4`', async () => {
    const row = page.locator('[role="treeitem"][data-id="e-4"]');
    const strand = row.locator('[data-strand]').first();
    await expect(strand).toHaveAttribute('data-strand', '1/2');
    await expect(strand.locator('g[data-bead]')).toHaveCount(2);
    await expect(strand).toContainText('1/2');
    await expect(row).toContainText('Prep 0/1');
  });
});
