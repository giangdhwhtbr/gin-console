// TC: TC-UI-126@25742614
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-126: Escape in the search box', async ({ page, ev }) => {
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

  await ev.step('3. Click the search box and type `pay`', async () => {
    const box = page.getByRole('searchbox', { name: 'Search' });
    await box.click();
    await box.pressSequentially('pay');
    await expect(box).toHaveValue('pay');
  });

  await ev.step('4. Press Escape', async () => {
    await page.keyboard.press('Escape');
    await expect(page.getByRole('searchbox', { name: 'Search' })).toHaveValue('');
    await expect(page).toHaveURL(/select=t-1/);
    await expect(page.getByRole('complementary', { name: 'Bead details' })).toBeVisible();
  });
});
