// TC: TC-UI-324@5e1f0987
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-324: Search shortcut in the List (REQ-UI-037)', async ({ page, ev }) => {
  // Precondition: the List view of project example is shown and a row has focus.
  await page.setViewportSize({ width: 1280, height: 900 });
  await stubApi(page, { projects: ['example'], beads: [bead('ex-1'), bead('ex-2')] });
  await page.goto('/beads?project=example');
  const row = page.getByRole('treeitem').first();
  await row.focus();
  await expect(row).toBeFocused();
  const search = page.getByRole('searchbox', { name: 'Search' });

  await ev.step('1. Press `/`', async () => {
    await page.keyboard.press('/');
    await expect(search).toBeFocused();
    await expect(search).toHaveValue('');
  });
});
