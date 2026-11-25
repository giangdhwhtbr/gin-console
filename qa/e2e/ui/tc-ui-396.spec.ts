// TC: TC-UI-396@c04b081e
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-396: Jump palette empty text and Escape (REQ-UI-154)', async ({ page, ev }) => {
  // Preconditions: email ann@x.com; projects a and b.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  await stubApi(page, { projects: ['a', 'b'], beads: [bead('a-1', { title: 'Build' })] });
  const dialog = page.getByRole('dialog');

  await ev.step('1. Open `/beads?project=a` and press Ctrl+K', async () => {
    await page.goto('/beads?project=a');
    await expect(page.getByRole('heading', { name: 'Beads', level: 1 })).toBeVisible();
    await page.keyboard.press('Control+k');
    await expect(dialog.getByText('Type an id or a title')).toBeVisible();
    await expect(dialog.getByRole('option')).toHaveCount(0);
  });
  await ev.step('2. Press Escape', async () => {
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
});
