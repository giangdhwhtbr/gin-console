// TC: TC-UI-054@7b7e1afe
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubBeadWithImages } from '../support/images';

test('TC-UI-054: Epic with a prep task (REQ-UI-028)', async ({ page, ev }) => {
  // Precondition (a bead with children; type feature, because an epic opens the tabbed page of REQ-UI-119): epic e-1 in project alpha has track t-1 (closed), track t-2 (open) and prep task p-1 (closed) labelled prep and prep:mockup.
  const child = (id: string, status: string, prep: boolean) => ({ id, title: `Child ${id}`, status, type: 'parent-child', prep });
  await stubBeadWithImages(
    page, 'alpha',
    bead('e-1', { issue_type: 'feature', child_counts: { total: 2, closed: 1, prep_total: 1, prep_closed: 1 } }),
    [],
    { detail: { children: [child('t-1', 'closed', false), child('t-2', 'open', false), child('p-1', 'closed', true)] } },
  );

  await ev.step('1. Open `/beads/alpha/e-1`', async () => {
    await page.goto('/beads/alpha/e-1');
    await expect(page.getByRole('img', { name: '1 done, 1 ready of 2 tracks' })).toHaveAttribute('data-strand', '1/2');
    await expect(page.getByText('Prep 1/1')).toBeVisible();
    const row = (id: string) => page.getByRole('listitem').filter({ has: page.getByRole('link', { name: id, exact: true }) });
    for (const id of ['t-1', 't-2', 'p-1']) await expect(row(id)).toBeVisible();
    await expect(row('p-1').getByText('Prep', { exact: true })).toBeVisible();
    await expect(row('t-1').getByText('Prep', { exact: true })).toHaveCount(0);
    await expect(row('t-2').getByText('Prep', { exact: true })).toHaveCount(0);
  });
});
