// TC: TC-UI-332@01e71a60
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubBeadPages } from '../support/shell';

const beads = [
  bead('e-1', { title: 'Epic one', issue_type: 'epic' }),
  bead('t-1', { title: 'Task one', parent: 'e-1', ready: true }),
  bead('t-2', { title: 'Task two', parent: 'e-1', ready: true }),
];

test('TC-UI-332: List Enter on a phone (REQ-UI-046)', async ({ page, ev }) => {
  // Precondition: the List at 390px wide; focus is on the row of t-1.
  await page.setViewportSize({ width: 390, height: 844 });
  await stubApi(page, { projects: ['example'], beads });
  await stubBeadPages(page, { example: beads });
  await page.goto('/beads?project=example');
  await page.getByRole('button', { name: 'Expand e-1' }).click();
  const row = page.locator('[role="treeitem"][data-id="t-1"]');
  await row.focus();
  await expect(row).toBeFocused();

  await ev.step('1. Press `Enter`', async () => {
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/beads\/example\/t-1$/);
    await expect(page.getByRole('heading', { name: 'Task one' })).toBeVisible();
  });
});
