// TC: TC-UI-308@8300faa5
import { test, expect } from '../evidence';
import { openEpicStubs, e12Counted, withComments } from '../support/epic';
import { plain } from '../support/lanes';

test('TC-UI-308: Large strand on the epic page', async ({ page, ev }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const counts = { total: 8, closed: 4, in_progress: 1, blocked: 1, ready: 2, deferred: 0, prep_total: 0, prep_closed: 0 };
  const beads = withComments(e12Counted()).map((b) => (b.id === 'ex-e12' ? { ...b, child_counts: counts } : b));
  await openEpicStubs(page, [...beads, ...plain()]);

  await ev.step('1. Open `/beads/P/ex-e12`', async () => {
    await page.goto('/beads/example/ex-e12');
    await expect(page.getByRole('heading', { name: 'Team checkout' })).toBeVisible();
  });

  await ev.step('2. Read the Progress card of the Overview tab', async () => {
    const strand = page.getByRole('img', { name: '4 done, 1 in progress, 1 blocked, 2 ready of 8 tracks' });
    await expect(strand).toBeVisible();
    await expect(strand.locator('g[data-bead]')).toHaveCount(8);
    await expect(strand).toContainText('4 done, 1 in progress, 1 blocked, 2 ready');
    // larger than the beads of a List row (radius 4.5)
    const r = Number(await strand.locator('g[data-bead] circle').first().getAttribute('r'));
    expect(r).toBeGreaterThan(6);
  });
});
