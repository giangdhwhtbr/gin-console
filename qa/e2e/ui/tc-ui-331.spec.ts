// TC: TC-UI-331@24262005
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubBeadPages } from '../support/shell';

const beads = [
  bead('e-1', { title: 'Epic one', issue_type: 'epic' }),
  bead('t-1', { title: 'Task one', parent: 'e-1', ready: true }),
  bead('t-2', { title: 'Task two', parent: 'e-1', ready: true }),
];

test('TC-UI-331: List open with Enter (REQ-UI-046)', async ({ page, ev }) => {
  // Precondition: the List at 1280px wide; the row of t-1 is selected and has focus.
  await page.setViewportSize({ width: 1280, height: 900 });
  await stubApi(page, { projects: ['example'], beads });
  await stubBeadPages(page, { example: beads });
  await page.goto('/beads?project=example&select=t-1');
  const row = page.locator('[role="treeitem"][data-id="t-1"]');
  await expect(row).toHaveAttribute('aria-selected', 'true');
  await row.focus();
  await expect(row).toBeFocused();

  await ev.step('1. Press `Enter`', async () => {
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/beads\/example\/t-1$/);
    await expect(page.getByRole('heading', { name: 'Task one' })).toBeVisible();
  });
});
