// TC: TC-UI-053@c0b7be66
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubBeadWithImages } from '../support/images';

test('TC-UI-053: Epic progress (REQ-UI-028)', async ({ page, ev }) => {
  // Precondition (a bead with children; type feature, because an epic opens the tabbed page of REQ-UI-119): epic e-1 in project alpha has 4 tracks t-1 to t-4, of which t-1, t-2 and t-3 are closed.
  const track = (id: string, status: string) => ({ id, title: `Track ${id}`, status, type: 'parent-child', prep: false });
  await stubBeadWithImages(
    page, 'alpha',
    bead('e-1', { issue_type: 'feature', child_counts: { total: 4, closed: 3, prep_total: 0, prep_closed: 0 } }),
    [],
    { detail: { children: [track('t-1', 'closed'), track('t-2', 'closed'), track('t-3', 'closed'), track('t-4', 'open')] } },
  );

  await ev.step('1. Open `/beads/alpha/e-1`', async () => {
    await page.goto('/beads/alpha/e-1');
    for (const id of ['t-1', 't-2', 't-3', 't-4']) await expect(page.getByRole('link', { name: id, exact: true })).toBeVisible();
    const strand = page.getByRole('img', { name: '3 done, 1 ready of 4 tracks' });
    await expect(strand).toHaveAttribute('data-strand', '3/4');
    await expect(strand.locator('g[data-bead]')).toHaveCount(4);
  });
});
