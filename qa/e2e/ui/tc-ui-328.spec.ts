// TC: TC-UI-328@945f4b2a
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubBeadPages } from '../support/shell';

const beads = [
  bead('e-1', { title: 'Epic one', issue_type: 'epic' }),
  bead('t-1', { title: 'Task one', parent: 'e-1', ready: true }),
  bead('t-2', { title: 'Task two', parent: 'e-1', ready: true }),
];

test('TC-UI-328: List move with Down and Up (REQ-UI-046)', async ({ page, ev }) => {
  // Precondition: the List view at 1280px wide with an open epic e-1 (t-1, t-2); focus is on the first row.
  await page.setViewportSize({ width: 1280, height: 900 });
  await stubApi(page, { projects: ['example'], beads });
  await page.goto('/beads?project=example');
  await page.getByRole('button', { name: 'Expand e-1' }).click();
  const row = (id: string) => page.locator(`[role="treeitem"][data-id="${id}"]`);
  await row('e-1').focus();
  await expect(row('e-1')).toBeFocused();

  await ev.step('1. Press Down', async () => {
    await page.keyboard.press('ArrowDown');
    await expect(row('t-1')).toBeFocused();
  });

  await ev.step('2. Press Up', async () => {
    await page.keyboard.press('ArrowUp');
    await expect(row('e-1')).toBeFocused();
  });
});
