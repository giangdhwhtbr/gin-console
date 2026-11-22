// TC: TC-UI-309@3a4041bb
import { test, expect } from '../evidence';
import { closedOn, epicOf, taskOf, nodeOf, stubProject } from '../support/graph';

test('TC-UI-309: Narrow Graph node keeps a segmented strand', async ({ page, ev }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const tracks = Array.from({ length: 12 }, (_, n) =>
    taskOf(`e-5.${n + 1}`, 'e-5', [], n < 3 ? closedOn : { ready: true }),
  );
  await stubProject(page, 'P', [
    epicOf('e-5', { title: 'Epic e-5' }),
    ...tracks,
    epicOf('e-6', { title: 'Epic e-6', blocked: true, blocked_by: ['e-5'], dependency_count: 1 }),
  ]);

  await ev.step('1. Open `/beads?project=P&view=graph`', async () => {
    await page.goto('/beads?project=P&view=graph&milestone=all&closed=1');
    await expect(nodeOf(page, 'e-5')).toBeVisible();
  });

  await ev.step('2. Find the node of `e-5`', async () => {
    const strand = nodeOf(page, 'e-5').locator('[data-strand]');
    await expect(strand).toHaveAttribute('data-strand', '3/12');
    await expect(strand.locator('g[data-bead]')).toHaveCount(0);
    await expect(strand.locator('rect[data-segment]')).toHaveCount(2);
    await expect(strand.getByText('3/12', { exact: true })).toBeVisible();
    const box = await strand.boundingBox();
    const node = await nodeOf(page, 'e-5').boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(node!.x + node!.width + 1);
  });
});
