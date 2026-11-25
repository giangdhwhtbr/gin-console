// TC: TC-UI-392@477a3fbd
import { test, expect } from '../evidence';
import { bead, beadDetail, stubApi, stubBeadDetails } from '../support/api';
import { beadsOf } from '../support/shell';

test('TC-UI-392: Jump palette finds a bead by title and opens it (REQ-UI-154)', async ({ page, ev }) => {
  // Preconditions: email ann@x.com; projects a and b; bead b-7 "Fix login redirect" in b.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  const b7 = bead('b-7', { title: 'Fix login redirect', ready: true });
  await stubApi(page, { projects: ['a', 'b'], beads: beadsOf({ a: [bead('a-1', { title: 'Build' })], b: [b7] }) });
  await stubBeadDetails(page, 'b', [beadDetail(b7)]);
  const dialog = page.getByRole('dialog');

  await ev.step('1. Open `/beads?project=a`', async () => {
    await page.goto('/beads?project=a');
    await expect(page.getByRole('heading', { name: 'Beads', level: 1 })).toBeVisible();
  });
  await ev.step('2. Press Ctrl+K', async () => {
    await page.keyboard.press('Control+k');
    await expect(dialog.getByRole('textbox', { name: 'Search beads' })).toBeFocused();
  });
  await ev.step('3. Type `login`', async () => {
    await page.keyboard.type('login');
    const option = dialog.getByRole('option', { name: /b-7/ });
    await expect(option).toContainText('Fix login redirect');
    await expect(option).toContainText('b');
    await expect(option).toHaveAttribute('aria-selected', 'true');
  });
  await ev.step('4. Press Enter with `b-7` selected', async () => {
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL((u) => u.pathname === '/beads/b/b-7');
    await expect(dialog).toHaveCount(0);
  });
});
