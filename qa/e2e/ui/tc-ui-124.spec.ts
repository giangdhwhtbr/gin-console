// TC: TC-UI-124@768f5020
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-124: Close the panel in the List view', async ({ page, ev }) => {
  const t1 = bead('t-1', { title: 'Pay invoices' });
  await stubApi(page, { projects: ['alpha'], beads: [t1] });
  // Registered after stubApi, so it answers the bead detail the panel loads.
  await page.route('**/api/beads/alpha/t-1', (route) =>
    route.fulfill({ json: { ...t1, description: null, design: null, notes: null, acceptance_criteria: null, close_reason: null, dependencies: [], dependents: [], children: [], bugs: [] } }));
  await page.route('**/api/beads/alpha/t-1/comments', (route) => route.fulfill({ json: [] }));

  await ev.step('1. Set the window width to 1280px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open /beads?project=alpha&milestone=all&view=list&select=t-1', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=list&select=t-1');
    await expect(page.getByRole('complementary', { name: 'Bead details' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Bead details' }).getByRole('heading', { name: 'Pay invoices' })).toBeVisible();
  });

  await ev.step('3. Choose "Close details" in the panel', async () => {
    await page.getByRole('button', { name: 'Close details' }).click();
    await expect(page).not.toHaveURL(/select=/);
    await expect(page.getByRole('complementary', { name: 'Bead details' })).toHaveCount(0);
    const tree = (await page.getByRole('tree', { name: 'Beads of alpha' }).boundingBox())!;
    const main = (await page.getByRole('main').boundingBox())!;
    expect(tree.width).toBeGreaterThan(main.width * 0.9);
    await expect(page.getByRole('treeitem', { name: /^t-1 / })).toBeFocused();
  });
});
