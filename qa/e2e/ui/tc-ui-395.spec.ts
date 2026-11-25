// TC: TC-UI-395@3d285a22
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-395: Jump palette caches until Refresh (REQ-UI-154)', async ({ page, ev }) => {
  // Preconditions: email ann@x.com; projects a and b.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  const stub = await stubApi(page, { projects: ['a', 'b'], beads: [bead('a-1', { title: 'Build' })] });
  const dialog = page.getByRole('dialog');
  const beadCalls = () => stub.calls.filter((u) => u.pathname === '/api/beads' && u.searchParams.get('closed') === '1').length;
  const openPalette = async () => {
    await page.keyboard.press('Control+k');
    await expect(dialog.getByText('Type an id or a title')).toBeVisible();
  };
  let before = 0;

  await ev.step('1. Open `/beads?project=a`, press Ctrl+K and press Escape', async () => {
    await page.goto('/beads?project=a');
    await expect(page.getByRole('heading', { name: 'Beads', level: 1 })).toBeVisible();
    before = beadCalls();
    await openPalette();
    await expect.poll(beadCalls).toBe(before + 2);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
  await ev.step('2. Press Ctrl+K again', async () => {
    await openPalette();
    await page.waitForLoadState('networkidle');
    await expect.poll(beadCalls).toBe(before + 2);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
  await ev.step('3. Click "Refresh data"', async () => {
    await page.getByRole('button', { name: 'Refresh data' }).click();
    await expect(page.getByRole('heading', { name: 'Beads', level: 1 })).toBeVisible();
  });
  await ev.step('4. Press Ctrl+K once more', async () => {
    const seen = beadCalls();
    await openPalette();
    await expect.poll(beadCalls).toBe(seen + 2);
  });
});
