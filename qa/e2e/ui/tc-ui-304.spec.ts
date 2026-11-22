// TC: TC-UI-304@6967dfa9
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-304: Strand of an epic with seven tracks', async ({ page, ev }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const counts = { total: 7, closed: 2, in_progress: 1, blocked: 1, ready: 3, deferred: 0, prep_total: 0, prep_closed: 0 };
  await stubApi(page, { beads: [bead('e-1', { title: 'Epic e-1', issue_type: 'epic', child_counts: counts })] });

  await ev.step('1. Open `/beads?project=P&view=list`', async () => {
    await page.goto('/beads?project=P&view=list');
    await expect(page.getByRole('link', { name: 'Epic e-1' })).toBeVisible();
  });

  await ev.step('2. Find the row of `e-1`', async () => {
    const row = page.locator('[role="treeitem"][data-id="e-1"]');
    const strand = row.getByRole('img', { name: '2 done, 1 in progress, 1 blocked, 3 ready of 7 tracks' });
    await expect(strand).toBeVisible();
    await expect(strand.locator('g[data-bead]')).toHaveCount(7);
    const shapes = await strand.locator('g[data-bead] > g[data-shape]').evaluateAll((els) => els.map((e) => e.getAttribute('data-shape')));
    expect(shapes).toEqual(['done', 'done', 'in_progress', 'blocked', 'ready', 'ready', 'ready']);
    await expect(strand).toHaveAttribute('data-strand', '2/7');
    await expect(strand).toContainText('2/7');
  });
});
