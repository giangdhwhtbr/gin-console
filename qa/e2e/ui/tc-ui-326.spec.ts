// TC: TC-UI-326@d1d597cf
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-326: Escape in the search box (REQ-UI-037)', async ({ page, ev }) => {
  // Precondition: the Beads page of project example; the search box holds "pay" and has focus.
  await page.setViewportSize({ width: 1280, height: 900 });
  await stubApi(page, { projects: ['example'], beads: [bead('ex-1', { title: 'Payment form' }), bead('ex-2')] });
  await page.goto('/beads?project=example');
  const search = page.getByRole('searchbox', { name: 'Search' });
  await search.fill('pay');
  await search.focus();
  await expect(search).toHaveValue('pay');
  await expect(search).toBeFocused();

  await ev.step('1. Press `Esc`', async () => {
    await page.keyboard.press('Escape');
    await expect(search).toHaveValue('');
    await expect(search).toBeFocused();
  });

  await ev.step('2. Press `Esc` again', async () => {
    await page.keyboard.press('Escape');
    await expect(search).not.toBeFocused();
  });
});
