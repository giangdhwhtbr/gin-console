// TC: TC-UI-329@e7813c13
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubBeadPages } from '../support/shell';

const beads = [
  bead('e-1', { title: 'Epic one', issue_type: 'epic' }),
  bead('t-1', { title: 'Task one', parent: 'e-1', ready: true }),
  bead('t-2', { title: 'Task two', parent: 'e-1', ready: true }),
];

test('TC-UI-329: List open and close with Right and Left (REQ-UI-046)', async ({ page, ev }) => {
  // Precondition: a closed epic e-1 with children; focus is on its row.
  await page.setViewportSize({ width: 1280, height: 900 });
  await stubApi(page, { projects: ['example'], beads });
  await page.goto('/beads?project=example');
  const row = (id: string) => page.locator(`[role="treeitem"][data-id="${id}"]`);
  await expect(row('e-1')).toHaveAttribute('aria-expanded', 'false');
  await expect(row('t-1')).toHaveCount(0);
  await row('e-1').focus();
  await expect(row('e-1')).toBeFocused();

  await ev.step('1. Press Right', async () => {
    await page.keyboard.press('ArrowRight');
    await expect(row('e-1')).toHaveAttribute('aria-expanded', 'true');
    await expect(row('t-1')).toBeVisible();
    await expect(row('e-1')).toBeFocused();
  });

  await ev.step('2. Press Right again', async () => {
    await page.keyboard.press('ArrowRight');
    await expect(row('t-1')).toBeFocused();
  });

  await ev.step('3. Press Left', async () => {
    await page.keyboard.press('ArrowLeft');
    await expect(row('e-1')).toBeFocused();
    await expect(row('e-1')).toHaveAttribute('aria-expanded', 'true');
  });

  await ev.step('4. Press Left again', async () => {
    await page.keyboard.press('ArrowLeft');
    await expect(row('e-1')).toHaveAttribute('aria-expanded', 'false');
    await expect(row('t-1')).toHaveCount(0);
  });
});
