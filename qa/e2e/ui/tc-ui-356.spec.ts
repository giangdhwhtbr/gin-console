// TC: TC-UI-356@2f9b6bc9
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-356: Search key hint and shortcut (REQ-UI-146)', async ({ page, ev }) => {
  // Precondition: the Beads page of project example at 1440px wide; focus is on a List row.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, { projects: ['example'], beads: [bead('ex-1'), bead('ex-2')] });
  await page.goto('/beads?project=example');
  const row = page.getByRole('treeitem').first();
  await row.focus();
  await expect(row).toBeFocused();
  const search = page.getByRole('searchbox', { name: 'Search' });

  await ev.step('1. Read the `searchbox "Search"`', async () => {
    await expect(search).toHaveAttribute('aria-keyshortcuts', '/');
    const hint = search.locator('xpath=..').locator('kbd');
    await expect(hint).toHaveText('/');
    await expect(hint).toBeVisible();
    const [s, k] = await Promise.all([search.boundingBox(), hint.boundingBox()]);
    expect(k!.x).toBeGreaterThan(s!.x + s!.width / 2);
    expect(k!.x + k!.width).toBeLessThanOrEqual(s!.x + s!.width);
  });

  await ev.step('2. Press `/`', async () => {
    await page.keyboard.press('/');
    await expect(search).toBeFocused();
    await expect(search).toHaveValue('');
  });
});
