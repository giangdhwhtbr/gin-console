// TC: TC-UI-394@3018ec44
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-394: Jump palette names a project that fails (REQ-UI-154)', async ({ page, ev }) => {
  // Preconditions: email ann@x.com; projects a and b; the beads request of b fails; a has a-1.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  await stubApi(page, {
    projects: ['a', 'b'],
    beads: (url) => (url.searchParams.get('project') === 'b' ? { status: 502, body: { error: 'bd failed' } } : [bead('a-1', { title: 'Build' })]),
  });
  const dialog = page.getByRole('dialog');

  await ev.step('1. Open `/beads?project=a` and press Ctrl+K', async () => {
    await page.goto('/beads?project=a');
    await expect(page.getByRole('heading', { name: 'Beads', level: 1 })).toBeVisible();
    await page.keyboard.press('Control+k');
    await expect(dialog.getByRole('textbox', { name: 'Search beads' })).toBeFocused();
  });
  await ev.step('2. Type `a-1`', async () => {
    await page.keyboard.type('a-1');
    await expect(dialog.getByRole('option', { name: /a-1/ })).toBeVisible();
    await expect(dialog.getByText('Could not load b')).toBeVisible();
  });
});
