// TC: TC-UI-361@9ebf784d
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';

test('TC-UI-361: Title link opens the page', async ({ page, ev }) => {
  // Precondition: the List view of project example at 1280px wide with bead t-1.
  const beads = [bead('t-1', { title: 'Pay invoices', ready: true, priority: 1 })];
  await stubApi(page, { projects: ['example'], beads });
  await stubDetails(page, beads, 'example');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/beads?project=example&milestone=all&view=list');
  await expect(page.getByRole('treeitem', { name: /^t-1 / })).toBeVisible();

  await ev.step('1. Click the title link of t-1', async () => {
    await page.getByRole('link', { name: 'Pay invoices' }).click();
    await expect(page).toHaveURL(/\/beads\/example\/t-1$/);
    await expect(page.getByRole('heading', { name: 'Pay invoices' })).toBeVisible();
  });
});
