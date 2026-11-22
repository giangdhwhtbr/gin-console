// TC: TC-UI-305@de99e2d7
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-305: Strand of more than 16 tracks is segmented', async ({ page, ev }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const counts = { total: 19, closed: 11, in_progress: 1, blocked: 0, ready: 6, deferred: 1, prep_total: 0, prep_closed: 0 };
  await stubApi(page, { beads: [bead('e-2', { title: 'Epic e-2', issue_type: 'epic', child_counts: counts })] });

  await ev.step('1. Open `/beads?project=P&view=list`', async () => {
    await page.goto('/beads?project=P&view=list');
    await expect(page.getByRole('link', { name: 'Epic e-2' })).toBeVisible();
  });

  await ev.step('2. Find the row of `e-2`', async () => {
    const row = page.locator('[role="treeitem"][data-id="e-2"]');
    const strand = row.getByRole('img', { name: '11 done, 1 in progress, 6 ready, 1 deferred of 19 tracks' });
    await expect(strand).toBeVisible();
    await expect(strand.locator('g[data-bead]')).toHaveCount(0);
    const segments = strand.locator('rect[data-segment]');
    await expect(segments).toHaveCount(4);
    const found = await segments.evaluateAll((els) =>
      els.map((e) => {
        const filled = e.getAttribute('stroke') === 'none';
        return { name: e.getAttribute('data-segment'), width: Number(e.getAttribute('width')) + (filled ? 0 : 1.5) };
      }),
    );
    expect(found.map((s) => s.name)).toEqual(['done', 'inProgress', 'ready', 'deferred']);
    // every segment is 1px plus its share of the room: the widths minus 1 are in the ratio 11, 1, 6, 1
    const unit = (found[0].width - 1) / 11;
    [11, 1, 6, 1].forEach((n, i) => expect(found[i].width - 1).toBeCloseTo(unit * n, 1));
    await expect(strand).toHaveAttribute('data-strand', '11/19');
    await expect(strand).toContainText('11/19');
  });
});
