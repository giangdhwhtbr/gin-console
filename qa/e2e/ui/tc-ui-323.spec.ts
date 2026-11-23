// TC: TC-UI-323@20199b41
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-323: Search shortcut on the Board (REQ-UI-037)', async ({ page, ev }) => {
  // Precondition: the Board of project example at 1280px wide, no field has focus.
  await page.setViewportSize({ width: 1280, height: 900 });
  await stubApi(page, { projects: ['example'], beads: [bead('ex-1', { ready: true }), bead('ex-2', { status: 'in_progress' })] });
  await page.goto('/beads?project=example&view=board');
  await expect(page.locator('[data-card]').first()).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const search = page.getByRole('searchbox', { name: 'Search' });
  await expect(search).not.toBeFocused();

  await ev.step('1. Press `/`', async () => {
    await page.keyboard.press('/');
    await expect(search).toBeFocused();
    await expect(search).toHaveValue('');
  });
});
