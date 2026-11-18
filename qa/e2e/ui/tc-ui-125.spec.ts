// TC: TC-UI-125@c26f6709
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-125: Escape closes the panel in the List view', async ({ page, ev }) => {
  const t1 = bead('t-1', { title: 'Pay invoices' });
  await stubApi(page, { projects: ['alpha'], beads: [t1] });
  await page.route('**/api/beads/alpha/t-1', (route) =>
    route.fulfill({ json: { ...t1, description: null, design: null, notes: null, acceptance_criteria: null, close_reason: null, dependencies: [], dependents: [], children: [], bugs: [] } }));
  await page.route('**/api/beads/alpha/t-1/comments', (route) => route.fulfill({ json: [] }));

  await ev.step('1. Set the window width to 1280px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open /beads?project=alpha&milestone=all&view=list&select=t-1', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=list&select=t-1');
    await expect(page.getByRole('complementary', { name: 'Bead details' }).getByRole('heading', { name: 'Pay invoices' })).toBeVisible();
  });

  await ev.step('3. Move focus to the row of `t-1`', async () => {
    const row = page.getByRole('treeitem', { name: /^t-1 / });
    await row.focus();
    await expect(row).toBeFocused();
  });

  await ev.step('4. Press Escape', async () => {
    await page.keyboard.press('Escape');
    await expect(page).not.toHaveURL(/select=/);
    await expect(page.getByRole('complementary', { name: 'Bead details' })).toHaveCount(0);
  });
});
