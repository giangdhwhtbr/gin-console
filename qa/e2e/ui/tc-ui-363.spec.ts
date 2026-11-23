// TC: TC-UI-363@1ab4d0d2
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';

test('TC-UI-363: Enter twice in the List', async ({ page, ev }) => {
  // Precondition: the List view at 1280px wide; focus is on the row of t-2, which is not selected.
  const beads = [bead('t-1', { title: 'Pay invoices', ready: true, priority: 1 }), bead('t-2', { title: 'Send reminders', ready: true, priority: 1 })];
  await stubApi(page, { projects: ['example'], beads });
  await stubDetails(page, beads, 'example');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/beads?project=example&milestone=all&view=list');
  const row = page.getByRole('treeitem', { name: /^t-2 / });
  await row.focus();
  await expect(row).toBeFocused();

  await ev.step('1. Press Enter', async () => {
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/[?&]select=t-2(&|$)/);
    const panel = page.getByRole('complementary', { name: 'Bead details' });
    await expect(panel.getByRole('heading', { name: 'Send reminders' })).toBeVisible();
  });

  await ev.step('2. Press Enter again', async () => {
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/beads\/example\/t-2$/);
  });
});
