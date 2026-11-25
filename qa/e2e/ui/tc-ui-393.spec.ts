// TC: TC-UI-393@425d74ef
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-393: Jump palette orders exact id and open beads first (REQ-UI-154)', async ({ page, ev }) => {
  // Preconditions: email ann@x.com; a-1 "Build" and a-10 "a-1 follow-up" open; closed a-2 and open a-3 both titled with "cache".
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  await stubApi(page, {
    beads: [
      bead('a-10', { title: 'a-1 follow-up' }),
      bead('a-1', { title: 'Build' }),
      bead('a-2', { title: 'Warm the cache', status: 'closed', closed_at: '2026-10-11T00:00:00Z' }),
      bead('a-3', { title: 'Clear the cache' }),
    ],
  });
  const dialog = page.getByRole('dialog');
  const options = dialog.getByRole('option');

  await ev.step('1. Open `/beads?project=P` and press Ctrl+K', async () => {
    await page.goto('/beads?project=P');
    await expect(page.getByRole('heading', { name: 'Beads', level: 1 })).toBeVisible();
    await page.keyboard.press('Control+k');
    await expect(dialog.getByText('Type an id or a title')).toBeVisible();
  });
  await ev.step('2. Type `a-1`', async () => {
    await page.keyboard.type('a-1');
    await expect(options).toHaveCount(2);
    await expect(options.first()).toContainText('Build');
    await expect(options.nth(1)).toContainText('a-1 follow-up');
  });
  await ev.step('3. Clear the text and type `cache`', async () => {
    await dialog.getByRole('textbox', { name: 'Search beads' }).fill('cache');
    await expect(options).toHaveCount(2);
    await expect(options.first()).toContainText('Clear the cache');
    await expect(options.nth(1)).toContainText('Warm the cache');
  });
});
