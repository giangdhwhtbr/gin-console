// TC: TC-UI-330@de6b3661
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubBeadPages } from '../support/shell';

const beads = [
  bead('e-1', { title: 'Epic one', issue_type: 'epic' }),
  bead('t-1', { title: 'Task one', parent: 'e-1', ready: true }),
  bead('t-2', { title: 'Task two', parent: 'e-1', ready: true }),
];

test('TC-UI-330: List select with Enter (REQ-UI-046)', async ({ page, ev }) => {
  // Precondition: the List at 1280px wide; focus is on the row of t-2, which is not selected.
  await page.setViewportSize({ width: 1280, height: 900 });
  await stubApi(page, { projects: ['example'], beads });
  await stubBeadPages(page, { example: beads });
  await page.goto('/beads?project=example');
  await page.getByRole('button', { name: 'Expand e-1' }).click();
  const row = page.locator('[role="treeitem"][data-id="t-2"]');
  await row.focus();
  await expect(row).toBeFocused();
  await expect(row).toHaveAttribute('aria-selected', 'false');

  await ev.step('1. Press `Enter`', async () => {
    await page.keyboard.press('Enter');
    await expect(row).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/select=t-2/);
    await expect(page.getByRole('complementary', { name: 'Bead details' }).getByRole('heading', { name: 'Task two' })).toBeVisible();
  });
});
