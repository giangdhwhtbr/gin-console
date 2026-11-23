// TC: TC-UI-371@f9d53822
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';

test('TC-UI-371: Selection kept across views', async ({ page, ev }) => {
  // Precondition: the List view at 1280px wide with select=x-1, a ready P3 bead that no Focus column holds.
  const beads = [bead('x-1', { title: 'Tidy docs', ready: true, priority: 3 }), bead('t-1', { title: 'Pay invoices', ready: true, priority: 1 })];
  await stubApi(page, { projects: ['example'], beads });
  await stubDetails(page, beads, 'example');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/beads?project=example&milestone=all&view=list&select=x-1');
  const panel = page.getByRole('complementary', { name: 'Bead details' });
  await expect(panel.getByRole('heading', { name: 'Tidy docs' })).toBeVisible();

  await ev.step('1. Choose the Focus view', async () => {
    await page.getByRole('navigation', { name: 'View' }).getByRole('button', { name: 'Focus' }).click();
    await expect(page).toHaveURL(/view=focus/);
    await expect(page).toHaveURL(/select=x-1/);
    await expect(page.locator('[data-card][data-id="t-1"]')).toBeVisible();
    await expect(page.locator('[data-card][data-id="x-1"]')).toHaveCount(0);
    await expect(panel.getByRole('heading', { name: 'Tidy docs' })).toBeVisible();
    await expect(panel.getByText('Not in the current list')).toBeVisible();
  });
});
